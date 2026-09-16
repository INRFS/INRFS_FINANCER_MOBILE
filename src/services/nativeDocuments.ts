import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { API_BASE_URL } from "../config/environment";
import { tokenStore } from "./apiClient";
import { platformApi } from "./platformApi";

type DocumentOwner = { customerId?: string; applicationId?: string; financerId?: string };
export type PickedDocument = { uri: string; name: string; mimeType: string; size?: number };

// The API caps the entire multipart request at 10 MiB; leave room for its form fields.
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024 - 64 * 1024;

export async function validateDocumentForUpload(asset: PickedDocument): Promise<void> {
  let size = asset.size;
  if (size === undefined) {
    const info = await FileSystem.getInfoAsync(asset.uri);
    if (!info.exists || info.isDirectory) throw new Error(`Cannot read ${asset.name}. Please select the document again.`);
    size = info.size;
  }
  if (!Number.isFinite(size) || size <= 0) throw new Error(`${asset.name} is empty or unreadable. Please select the document again.`);
  if (size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error(`${asset.name} is too large. Choose a document smaller than 10 MB.`);
  }
}

export async function pickDocument(type = "*/*"): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset ? { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? "application/octet-stream", size: asset.size } : null;
}

export async function uploadPickedDocument(asset: PickedDocument, category: string, owner: DocumentOwner) {
  await validateDocumentForUpload(asset);
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
  if (result.status === 404) {
    throw new Error("The document record exists, but its stored file is unavailable. Please upload the document again or restore the server document storage.");
  }
  if (result.status < 200 || result.status >= 300) throw new Error(`Document download failed (${result.status}).`);

  const extension = safeName.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = ({
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
  } as Record<string, string>)[extension] ?? "application/octet-stream";

  if (Platform.OS === "android") {
    try {
      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1,
        type: mimeType,
      });
      return result.uri;
    } catch {
      // Some Android devices have no viewer for a given file type; offer sharing as a fallback.
    }
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { dialogTitle: `Open ${safeName}`, mimeType });
  } else {
    throw new Error("No application is available to open this document.");
  }
  return result.uri;
}

export async function previewPickedDocument(asset: PickedDocument) {
  if (Platform.OS === "android") {
    try {
      const contentUri = await FileSystem.getContentUriAsync(asset.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1,
        type: asset.mimeType,
      });
      return;
    } catch {
      // Fall through to the platform share sheet when no viewer is installed.
    }
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(asset.uri, { dialogTitle: `Preview ${asset.name}`, mimeType: asset.mimeType });
    return;
  }
  throw new Error("No application is available to preview this document.");
}

export async function takePhoto(allowsEditing = false): Promise<PickedDocument | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("Camera permission is required to take a customer photograph.");
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing,
    ...(allowsEditing ? { aspect: [3, 4] as [number, number] } : {}),
    quality: 0.8,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const mimeType = asset.mimeType ?? "image/jpeg";
  const extension = mimeType === "image/png" ? "png" : "jpg";
  return { uri: asset.uri, name: asset.fileName ?? `customer-photo-${Date.now()}.${extension}`, mimeType, size: asset.fileSize };
}
