import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WebRtcGateway } from './webrtc.gateway';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [WebRtcGateway],
})
export class WebRtcModule {}
