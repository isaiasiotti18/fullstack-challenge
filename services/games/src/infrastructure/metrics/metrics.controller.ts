import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response): Promise<void> {
    const metricsData = await this.metrics.getMetrics();
    res.set("Content-Type", this.metrics.getContentType());
    res.end(metricsData);
  }
}
