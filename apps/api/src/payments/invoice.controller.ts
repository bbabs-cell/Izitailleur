import { Controller, Get, Header, Param, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import { JwtAuthGuard, type AuthenticatedUser } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PaymentsService } from "./payments.service";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MOOV_MONEY: "Moov Money",
  MTN_MONEY: "MTN Mobile Money",
  OTHER: "Autre",
};

/**
 * Facture complète d'une commande : contrairement au reçu (émis pour un seul paiement), la
 * facture récapitule l'intégralité de la commande — prix, acompte, historique des paiements et
 * solde restant — à partir des données réelles au moment de la génération.
 */
@Controller("orders/:orderId/invoice")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("OWNER", "ADMIN", "MANAGER")
export class InvoiceController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("pdf")
  @Header("Content-Type", "application/pdf")
  async pdf(@CurrentUser() user: AuthenticatedUser, @Param("orderId") orderId: string, @Res() res: Response) {
    const { order, totalPaid, balance } = await this.paymentsService.getInvoiceData(user.workshopId, orderId);
    res.setHeader("Content-Disposition", `inline; filename="facture-${order.reference}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 50, compress: false });
    doc.pipe(res);

    doc.fontSize(20).text(order.workshop.name, { align: "center" });
    if (order.workshop.address) {
      doc.fontSize(9).fillColor("#555555").text(order.workshop.address, { align: "center" });
    }
    if (order.workshop.phone) {
      doc.fontSize(9).text(order.workshop.phone, { align: "center" });
    }
    doc.moveDown(1.5);

    doc.fillColor("#000000").fontSize(16).text(`Facture — Commande #${order.reference}`, { align: "center" });
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`);
    doc.text(`Client : ${order.customer.firstName} ${order.customer.lastName}`);
    if (order.customer.phone) doc.text(`Téléphone : ${order.customer.phone}`);
    if (order.customer.address) doc.text(`Adresse : ${order.customer.address}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Détail de la commande", { underline: true });
    doc.fontSize(11);
    doc.text(`Modèle : ${order.modelName}`);
    if (order.fabricDescription) doc.text(`Tissu : ${order.fabricDescription}`);
    doc.text(`Date limite : ${order.dueDate.toLocaleDateString("fr-FR")}`);
    doc.text(`Prix total : ${order.price.toLocaleString("fr-FR")} FCFA`);
    doc.text(`Acompte initial : ${order.deposit.toLocaleString("fr-FR")} FCFA`);
    doc.moveDown(1);

    doc.fontSize(12).text("Paiements reçus", { underline: true });
    doc.fontSize(11);
    if (order.payments.length === 0) {
      doc.text("Aucun paiement additionnel enregistré (hors acompte initial).");
    } else {
      for (const payment of order.payments) {
        doc.text(
          `${payment.createdAt.toLocaleDateString("fr-FR")} — ${payment.amount.toLocaleString("fr-FR")} FCFA — ` +
            `${PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}` +
            (payment.recordedBy ? ` (enregistré par ${payment.recordedBy.fullName})` : ""),
        );
      }
    }
    doc.moveDown(1.5);

    doc.fontSize(14).text(`Total payé : ${totalPaid.toLocaleString("fr-FR")} FCFA`);
    doc
      .fontSize(14)
      .fillColor(balance > 0 ? "#b45309" : "#15803d")
      .text(
        balance > 0
          ? `Solde restant : ${balance.toLocaleString("fr-FR")} FCFA`
          : "Commande payée intégralement",
      );

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor("#555555")
      .text(order.workshop.receiptFooterMessage || "Merci de votre confiance.", { align: "center" });

    doc.end();
  }
}
