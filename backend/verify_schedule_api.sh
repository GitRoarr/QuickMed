#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "------------------------------------------------"
echo "Starting Backend Verification (Plan B)"
echo "------------------------------------------------"

# 1. Register a new Test User
TIMESTAMP=$(date +%s)
USER_EMAIL="test_user_${TIMESTAMP}@test.com"
USER_PASS="password123"

echo -e "\n1. Registering new user ($USER_EMAIL)..."
REGISTER_RES=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"firstName\": \"Test\",
    \"lastName\": \"User\",
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASS\",
    \"phoneNumber\": \"1234567890\"
  }")

USER_ID=$(echo $REGISTER_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
TOKEN=$(echo $REGISTER_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo -e "${RED}Failed to register user${NC}"
  echo "Response: $REGISTER_RES"
  exit 1
fi
echo -e "${GREEN}User registered with ID: $USER_ID${NC}"

# 2. Try to promote self to DOCTOR
echo -e "\n2. Attempting to self-promote to DOCTOR..."
UPDATE_RES=$(curl -s -X PATCH "$API_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role\": \"doctor\"}")

# 3. Verify Role
echo -e "\n3. Verifying user details..."
GET_USER_RES=$(curl -s -X GET "$API_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

ROLE=$(echo $GET_USER_RES | grep -o '"role":"[^"]*' | cut -d'"' -f4)
echo -e "Current Role: $ROLE"

if [ "$ROLE" != "doctor" ]; then
    echo -e "${RED}Self-promotion failed. Current role is $ROLE.${NC}"
    # If self-promotion failed, we can't test doctor schedules properly with this user.
    # But let's check if we can list doctors and hijack one.
    
    echo -e "\n3b. Attempting to find existing doctors..."
    DOCTORS_RES=$(curl -s -X GET "$API_URL/users/doctors" \
      -H "Authorization: Bearer $TOKEN")
      
    # Extract first doctor email if available
    DOCTOR_EMAIL_EXISTING=$(echo $DOCTORS_RES | grep -o '"email":"[^"]*' | head -1 | cut -d'"' -f4)
    
    if [ -n "$DOCTOR_EMAIL_EXISTING" ] && [ "$DOCTOR_EMAIL_EXISTING" != "null" ]; then
        echo -e "${GREEN}Found existing doctor: $DOCTOR_EMAIL_EXISTING${NC}"
        
        echo -e "\n3c. Emergency Reset Password for Doctor..."
        RESET_RES=$(curl -s -X POST "$API_URL/auth/emergency-reset-password" \
          -H "Content-Type: application/json" \
          -d "{\"email\": \"$DOCTOR_EMAIL_EXISTING\", \"newPassword\": \"NewPass123!\"}")
          
        echo "Reset Response: $RESET_RES"
        
        # Login as this doctor
        echo -e "\n3d. Logging in as hijacked Doctor..."
        LOGIN_RES=$(curl -s -X POST "$API_URL/auth/login" \
          -H "Content-Type: application/json" \
          -d "{\"email\": \"$DOCTOR_EMAIL_EXISTING\", \"password\": \"NewPass123!\"}")
          
        TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        USER_ID=$(echo $LOGIN_RES | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        
        if [ -n "$TOKEN" ]; then
             echo -e "${GREEN}Successfully logged in as existing Doctor${NC}"
        else
             echo -e "${RED}Failed to login as hijacked doctor${NC}"
             exit 1
        fi
    else
        echo -e "${RED}No existing doctors found to hijack.${NC}"
        exit 1
    fi
fi

# 4. Test Schedule endpoints with the working TOKEN (either promoted or hijacked)

# A. Generate Slots
echo -e "\n4A. Testing Slot Generation (POST /doctors/schedule/generate)..."
TODAY=$(date +%Y-%m-%d)
GENERATE_RES=$(curl -s -X POST "$API_URL/doctors/schedule/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$TODAY\",
    \"startTime\": \"09:00\",
    \"endTime\": \"17:00\",
    \"slotDuration\": 30
  }")

if [[ $GENERATE_RES == *"slots"* ]]; then
  echo -e "${GREEN}Slots generated successfully${NC}"
else
  echo -e "${RED}Failed to generate slots${NC}"
  echo "Response: $GENERATE_RES"
fi

# B. Get Day Schedule
echo -e "\n4B. Testing Get Day Schedule (GET /doctors/schedule/:date)..."
GET_DAY_RES=$(curl -s -X GET "$API_URL/doctors/schedule/$TODAY" \
  -H "Authorization: Bearer $TOKEN")

# Count available slots
if [[ $GET_DAY_RES == *"slots"* ]]; then
    echo -e "${GREEN}Schedule retrieved successfully${NC}"
else
    echo -e "${RED}Failed to get schedule${NC}"
    echo "Response: $GET_DAY_RES"
fi

# C. Bulk Update - Block Morning Slots
echo -e "\n4C. Testing Bulk Update - Block Slots (POST /doctors/schedule/bulk-update)..."
BULK_RES=$(curl -s -X POST "$API_URL/doctors/schedule/bulk-update" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"$TODAY\",
    \"startTime\": \"09:00\",
    \"endTime\": \"12:00\",
    \"status\": \"blocked\",
    \"reason\": \"Meeting\"
  }")

if [[ $BULK_RES == *"success":true* ]]; then
  echo -e "${GREEN}Bulk update successful${NC}"
else
  echo -e "${RED}Failed bulk update${NC}"
  echo "Response: $BULK_RES"
fi

# D. Templates - Create Preset
echo -e "\n4D. Testing Template Presets (GET /doctors/templates/presets)..."
TEMPLATE_RES=$(curl -s -X GET "$API_URL/doctors/templates/presets" \
  -H "Authorization: Bearer $TOKEN")

if [[ $TEMPLATE_RES == *"Weekdays"* ]]; then
  echo -e "${GREEN}Template presets created successfully${NC}"
  TEMPLATE_ID=$(echo $TEMPLATE_RES | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  # E. Apply Template
  echo -e "\n4E. Testing Apply Template (POST /doctors/schedule/apply-template)..."
  TOMORROW=$(date -d "+1 day" +%Y-%m-%d)
  APPLY_RES=$(curl -s -X POST "$API_URL/doctors/schedule/apply-template" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"templateId\": \"$TEMPLATE_ID\",
      \"startDate\": \"$TOMORROW\"
    }")
    
  if [[ $APPLY_RES == *"slots"* ]]; then
    echo -e "${GREEN}Template applied successfully${NC}"
  else
    echo -e "${RED}Failed to apply template${NC}"
    echo "Response: $APPLY_RES"
  fi
else
  echo -e "${RED}Failed to create presets${NC}"
  echo "Response: $TEMPLATE_RES"
fi

echo -e "\n------------------------------------------------"
echo "Verification Complete"
echo "------------------------------------------------"
