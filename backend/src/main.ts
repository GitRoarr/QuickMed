import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Enable CORS for Angular frontend
  app.enableCors({
    origin: "http://localhost:4200",
    credentials: true,
  })

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Set global prefix for API routes
  app.setGlobalPrefix("api")

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`🚀 CareHub Backend API running on http://localhost:${port}/api`)
}
bootstrap()
