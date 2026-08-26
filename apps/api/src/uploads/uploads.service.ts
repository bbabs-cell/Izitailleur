import { randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_URL_TTL_SECONDS = 300;

/**
 * Stockage des photos de commandes sur Cloudflare R2 (compatible S3). Décision validée avec le
 * propriétaire du produit — voir docs/ARCHITECTURE.md. Le client (mobile) envoie l'image
 * directement à R2 via une URL pré-signée : l'API ne transite jamais le fichier lui-même.
 *
 * N'est actif que si les variables d'environnement R2 sont toutes définies. Sans configuration,
 * la fonctionnalité échoue explicitement (503) plutôt que de prétendre fonctionner.
 */
@Injectable()
export class UploadsService {
  private readonly client: S3Client | null;
  private readonly bucket: string | undefined;
  private readonly publicBaseUrl: string | undefined;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = process.env.R2_BUCKET;
    this.publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

    if (accountId && accessKeyId && secretAccessKey && this.bucket && this.publicBaseUrl) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.client = null;
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async presignOrderImageUpload(
    workshopId: string,
    orderId: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!this.client || !this.bucket || !this.publicBaseUrl) {
      throw new ServiceUnavailableException(
        "Le stockage des photos n'est pas configuré sur ce serveur (variables R2 manquantes).",
      );
    }

    const extension = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
    const key = `workshops/${workshopId}/orders/${orderId}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
    const publicUrl = `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;

    return { uploadUrl, publicUrl };
  }
}
