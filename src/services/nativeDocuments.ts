import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { API_BASE_URL } from "../config/environment";
import { tokenStore } from "./apiClient";
import { platformApi } from "./platformApi";

type DocumentOwner = { customerId?: string; applicationId?: string; financerId?: string };
export type PickedDocument = { uri: string; name: string; mimeType: string; size?: number };

export async function pickDocument(type = "*/*"): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset ? { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size } : null;
}

export async function uploadPickedDocument(asset: PickedDocument, category: string, owner: DocumentOwner) {
  const data = new FormData();
  data.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType } as unknown as Blob);
  data.append("category", category);
  if (owner.customerId) data.append("customerId", owner.customerId);
  if (owner.applicationId) data.append("applicationId", owner.applicationId);
  if (owner.financerId) data.append("financerId", owner.financerId);
  return platformApi.documents.upload(data);
}

export async function pickAndUploadDocument(category: string, owner: DocumentOwner) {
  const asset = await pickDocument();
  if (!asset) return null;
  return uploadPickedDocument(asset, category, owner);
}

export async function downloadAndShareDocument(id: string, originalFileName = "document") {
  const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const target = `${FileSystem.cacheDirectory}${Date.now()}-${safeName}`;
  const token = tokenStore.access();
  const result = await FileSystem.downloadAsync(`${API_BASE_URL}/documents/${id}/content`, target, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`Document download failed (${result.status}).`);
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { dialogTitle: safeName });
  return result.uri;
}
