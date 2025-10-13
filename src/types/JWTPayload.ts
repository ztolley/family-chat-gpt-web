export interface JWTPayload {
  exp?: number;
  iss?: string;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}
