import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: '*' } })
export class WebRtcGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) return client.disconnect(true);
      await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET') || 'defaultSecret',
      });
    } catch (e) {
      return client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // broadcast leave events for rooms the client was in except its own room
    for (const room of client.rooms) {
      if (room !== client.id) {
        client.to(room).emit('webrtc:user-left', { socketId: client.id });
      }
    }
  }

  @SubscribeMessage('webrtc:join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string }) {
    const roomId = payload?.roomId;
    if (!roomId) return;
    await client.join(roomId);
    const size = this.server.sockets.adapter.rooms.get(roomId)?.size || 1;
    client.to(roomId).emit('webrtc:user-joined', { socketId: client.id });
    // Inform the joining client about room info
    client.emit('webrtc:room-info', { participants: size });
  }

  @SubscribeMessage('webrtc:leave')
  async leave(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string }) {
    const roomId = payload?.roomId;
    if (!roomId) return;
    await client.leave(roomId);
    client.to(roomId).emit('webrtc:user-left', { socketId: client.id });
  }

  @SubscribeMessage('webrtc:offer')
  offer(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; sdp: any }) {
    if (!payload?.roomId || !payload?.sdp) return;
    client.to(payload.roomId).emit('webrtc:offer', { from: client.id, sdp: payload.sdp });
  }

  @SubscribeMessage('webrtc:answer')
  answer(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; sdp: any }) {
    if (!payload?.roomId || !payload?.sdp) return;
    client.to(payload.roomId).emit('webrtc:answer', { from: client.id, sdp: payload.sdp });
  }

  @SubscribeMessage('webrtc:ice')
  ice(@ConnectedSocket() client: Socket, @MessageBody() payload: { roomId: string; candidate: any }) {
    if (!payload?.roomId || !payload?.candidate) return;
    client.to(payload.roomId).emit('webrtc:ice', { from: client.id, candidate: payload.candidate });
  }

  private extractToken(client: Socket): string | undefined {
    if (client.handshake.auth?.token) return client.handshake.auth.token;
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7);
    return undefined;
  }
}
