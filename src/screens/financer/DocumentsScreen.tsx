import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { Card, Button, Segmented } from "../../components/ui";
import { platformApi } from "../../services/platformApi";
import { downloadAndShareDocument } from "../../services/nativeDocuments";
import { s } from "./styles";
import * as DocumentPicker from "expo-document-picker";

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export function DocumentsScreen({ customerId }: { customerId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("Aadhaar");

  const loadDocuments = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await platformApi.documents.listForCustomer(customerId);
      setDocuments(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const handleUpload = async () => {
    if (!customerId) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      
      const asset = res.assets[0];
      if (!asset) return;

      const fileUri = asset.uri;
      const fileName = asset.name;
      const mimeType = asset.mimeType || "application/octet-stream";

      setUploading(true);
      const formData = new FormData();
      formData.append("file", { uri: fileUri, name: fileName, type: mimeType } as any);
      formData.append("category", category);
      formData.append("customerId", customerId);
      
      await platformApi.documents.upload(formData as any);
      Alert.alert("Success", "Document uploaded successfully.");
      await loadDocuments();
    } catch (e) {
      Alert.alert("Upload Error", e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const downloadDoc = async (doc: any) => {
    try { await downloadAndShareDocument(doc.id, doc.originalFileName); }
    catch (reason) { Alert.alert("Open failed", reason instanceof Error ? reason.message : "Could not open document"); }
  };

  if (!customerId) {
    return <View><Text style={s.muted}>Please select a customer first.</Text></View>;
  }

  return (
    <View style={s.gap}>
      <Card>
        <Text style={s.label}>Upload New Document</Text>
        <Segmented 
          options={["Aadhaar", "Pan", "AddressProof", "Photograph", "Other"]}
          value={category} 
          onChange={setCategory} 
        />
        <Button label={`Select & Upload ${category}`} loading={uploading} onPress={() => void handleUpload()} style={{ marginTop: 10 }} />
      </Card>

      {error ? <Text style={s.error}>{error}</Text> : null}
      
      {loading ? (
        <Text style={s.muted}>Loading documents...</Text>
      ) : documents.length === 0 ? (
        <Text style={s.muted}>No documents uploaded for this customer.</Text>
      ) : (
        documents.map(doc => (
          <Card key={doc.id}>
            <View style={s.between}>
              <View style={s.flex}>
                <Text style={s.title}>{doc.category}</Text>
                <Text style={s.meta}>{doc.originalFileName}</Text>
                <Text style={s.meta}>{(Number(doc.size || 0) / 1024).toFixed(1)} KB · {formatDate(doc.createdAt)}</Text>
              </View>
              <Button label="View" variant="secondary" onPress={() => void downloadDoc(doc)} />
            </View>
          </Card>
        ))
      )}
    </View>
  );
}
