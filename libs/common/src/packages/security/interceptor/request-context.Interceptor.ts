import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { RequestContext } from "../../../types";
import { UAParser } from "ua-parser-js";
import * as geoip from 'geoip-lite';

@Injectable()
export class RequestContextInterceptor
  implements NestInterceptor
{
  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request & { context: RequestContext }>();

    const ua = UAParser(req.context.userAgent || '');

    req.context.browser = ua.browser.name;
    req.context.os = ua.os.name;
    req.context.device = ua.device.type || 'desktop';

    req.context.timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Geo
    const geo = await geoip.lookup(req.context.ipAddress);
    req.context.locationCountry = geo.country;
    req.context.locationCity = geo.city;

    return next.handle();
  }
}
