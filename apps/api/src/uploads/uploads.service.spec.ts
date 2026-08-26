import { UploadsService } from "./uploads.service";

// La présignature S3/R2 est un calcul cryptographique purement local (aucun appel réseau) :
// on peut donc vérifier honnêtement, sans compte R2 réel, que l'URL générée est bien formée et
// pointe vers le bon compartiment/chemin. Le test d'upload réel (PUT vers R2) nécessiterait un
// compte R2 réel et n'est pas simulé ici — voir docs/DEPLOYMENT.md.
describe("UploadsService", () => {
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("se déclare non configuré quand les variables R2 sont absentes", () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.R2_ACCOUNT_ID;
    const service = new UploadsService();
    expect(service.isConfigured()).toBe(false);
  });

  it("génère une URL de téléversement pré-signée pointant vers le bon compte et compartiment R2", async () => {
    process.env = {
      ...ORIGINAL_ENV,
      R2_ACCOUNT_ID: "test-account-id",
      R2_ACCESS_KEY_ID: "test-access-key",
      R2_SECRET_ACCESS_KEY: "test-secret-key",
      R2_BUCKET: "izitailleur-photos",
      R2_PUBLIC_BASE_URL: "https://photos.izitailleur.example",
    };
    const service = new UploadsService();
    expect(service.isConfigured()).toBe(true);

    const { uploadUrl, publicUrl } = await service.presignOrderImageUpload(
      "workshop-1",
      "order-1",
      "image/jpeg",
    );

    expect(uploadUrl).toContain("izitailleur-photos.test-account-id.r2.cloudflarestorage.com");
    expect(uploadUrl).toContain("/workshops/workshop-1/orders/order-1/");
    expect(uploadUrl).toMatch(/X-Amz-Signature=/);

    expect(publicUrl).toMatch(/^https:\/\/photos\.izitailleur\.example\/workshops\/workshop-1\/orders\/order-1\/.+\.jpg$/);
  });

  it("refuse de présigner quand le service n'est pas configuré", async () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.R2_ACCOUNT_ID;
    const service = new UploadsService();
    await expect(service.presignOrderImageUpload("w", "o", "image/jpeg")).rejects.toThrow(
      /pas configuré/i,
    );
  });
});
