import { Injectable } from '@nestjs/common';

export interface LandingFeature {
    icon: string;
    title: string;
    description: string;
}

export interface LandingStep {
    number: number;
    title: string;
    description: string;
}

@Injectable()
export class LandingService {
    getFeatures(): LandingFeature[] {
        return [
            {
                icon: 'bi-calendar-check',
                title: 'Smart Booking',
                description: 'Find and book the best specialists in seconds with our intelligent scheduling system.',
            },
            {
                icon: 'bi-lightning-charge',
                title: 'Instant Access',
                description: 'Zero wait times. Get matched with top-tier doctors in your city instantly.',
            },
            {
                icon: 'bi-shield-check',
                title: 'Secure Vault',
                description: 'Keep your medical history encrypted and safe. Accessible only by you and your doctors.',
            },
            {
                icon: 'bi-camera-video',
                title: 'Virtual Care',
                description: 'Consult with doctors from the comfort of your home via HD video calls.',
            },
        ];
    }

    getSteps(): LandingStep[] {
        return [
            {
                number: 1,
                title: 'Create Profile',
                description: 'Sign up and complete your health profile to get personalized recommendations.',
            },
            {
                number: 2,
                title: 'Find Specialist',
                description: 'Search by specialty, location, or availability to find your perfect doctor.',
            },
            {
                number: 3,
                title: 'Book & Consult',
                description: 'Confirm your appointment and connect with your doctor instantly via the app.',
            },
        ];
    }
}
