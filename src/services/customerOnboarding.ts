import { platformApi } from "./platformApi";
import { uploadPickedDocument, validateDocumentForUpload, type PickedDocument } from "./nativeDocuments";

export type CustomerSaveProgress = {
  customerId?: string;
  uploadedDocuments: Set<PickedDocument>;
};

export async function saveCustomerWithDocuments(
  details: Record<string, unknown>,
  documents: { asset: PickedDocument; category: string }[],
  progress: CustomerSaveProgress,
) {
  // Reject invalid files before creating any customer or uploading any documents.
  for (const { asset } of documents) await validateDocumentForUpload(asset);

  if (progress.customerId) {
    // Update requires status; preserve the current server value rather than
    // letting a missing enum field reset the customer to Pending on retry.
    const customer = await platformApi.customers.get(progress.customerId);
    if (!customer.status) throw new Error("Could not confirm customer status. Please retry.");
    await platformApi.customers.update(progress.customerId, { ...details, status: customer.status });
  } else {
    const created = await platformApi.customers.create(details);
    progress.customerId = created.id;
  }

  for (const { asset, category } of documents) {
    if (progress.uploadedDocuments.has(asset)) continue;
    await uploadPickedDocument(asset, category, { customerId: progress.customerId });
    progress.uploadedDocuments.add(asset);
  }
}
