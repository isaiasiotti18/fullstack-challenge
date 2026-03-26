import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri:
          process.env.KEYCLOAK_JWKS_URI ??
          "http://localhost:8080/realms/crash-game/protocol/openid-connect/certs",
      }),
      issuer: process.env.KEYCLOAK_ISSUER_URL ?? "http://localhost:8080/realms/crash-game",
      algorithms: ["RS256"],
    });
  }

  validate(payload: { sub: string; preferred_username: string }): {
    userId: string;
    username: string;
  } {
    return {
      userId: payload.sub,
      username: payload.preferred_username,
    };
  }
}
