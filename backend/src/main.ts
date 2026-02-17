import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"
import * as dotenv from "dotenv"
import { join } from "path"

// Load environment variables early so services using process.env see them
dotenv.config({ path: join(__dirname, "..", ".env") }) // ts-node / src
dotenv.config({ path: join(__dirname, "..", "..", ".env") }) // compiled dist
dotenv.config() // fallback to CWD

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Flexible CORS configuration
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const allowedOrigins = frontendUrl.split(',').map(url => url.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some(u => origin === u) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost');

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-doctor-id'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix("api")
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000
  await app.listen(port)

  // Production logging should be less verbose
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Backend API running on http://localhost:${port}/api`)
    console.log(`CORS allowed for: ${frontendUrl}`)
  }
}
bootstrap()

