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

  app.enableCors({
    origin: true,
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

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`Backend API running on http://localhost:${port}/api`)
}
bootstrap()
