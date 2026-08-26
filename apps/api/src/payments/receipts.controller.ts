import { Controller, Get, Header, Param, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ReceiptsService } from "./receipts.service";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MOOV_MONEY: "Moov Money",
  MTN_MONEY: "MTN Mobile Money",
  OTHER: "Autre",
};

@Controller("receipts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "MANAGER")
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.receiptsService.getOrThrow(user.workshopId, id);
  }

  @Get(":id/pdf")
  @Header("Content-Type", "application/pdf")
  async pdf(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() res: Response) {
    const receipt = await this.receiptsService.getOrThrow(user.workshopId, id);
    res.setHeader("Content-Disposition", `inline; filename="recu-${receipt.number}.pdf"`);

    const doc = new PDFDocument({ size: "A5", margin: 40, compress: false });
    doc.pipe(res);

    doc.fontSize(18).text(receipt.workshop.name, { align: "center" });
    if (receipt.workshop.address) {
      doc.fontSize(9).fillColor("#555555").text(receipt.workshop.address, { align: "center" });
    }
    if (receipt.workshop.phone) {
      doc.fontSize(9).text(receipt.workshop.phone, { align: "center" });
    }
    doc.moveDown(1.5);

    doc.fillColor("#000000").fontSize(14).text(`Reçu ${receipt.number}`, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text(`Date : ${receipt.createdAt.toLocaleDateString("fr-FR")}`);
    doc.text(`Client : ${receipt.order.customer.firstName} ${receipt.order.customer.lastName}`);
    doc.text(`Commande : #${receipt.order.reference} — ${receipt.order.modelName}`);
    doc.text(`Mode de paiement : ${PAYMENT_METHOD_LABELS[receipt.method] ?? receipt.method}`);
    doc.moveDown(1);

    doc.fontSize(16).text(`Montant reçu : ${receipt.amount.toLocaleString("fr-FR")} FCFA`, {
      align: "center",
    });

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor("#555555")
      .text(receipt.workshop.receiptFooterMessage || "Merci de votre confiance.", { align: "center" });

    doc.end();
  }
}
