import SubHeader from "@/components/dashboard/SubHeader";
import LottieView from "lottie-react-native";
import {
  FileText,
  ShieldCheck,
  FileCheck,
  Calendar,
  File,
  Download,
  Eye,
  X,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  Image,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";
import * as IntentLauncher from "expo-intent-launcher";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useAppTheme } from "@/theme";
import { apiFetch, getFileUrl, resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const Document = () => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector(
    (state: RootState) => state.home
  );
  const student = dashboardData?.student_details;

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const [previewingId, setPreviewingId] = useState<number | string | null>(null);
  const [previewImageDoc, setPreviewImageDoc] = useState<{
    title: string;
    url: string;
    doc: any;
  } | null>(null);

  const targetStudentId = resolveStudentId(
    params.student_id,
    selectedStudentId,
    dashboardData,
    user
  );

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadDocuments = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const activeId = resolveStudentId(
          params.student_id,
          selectedStudentId,
          dashboardData,
          user
        );
        if (!activeId) {
          setLoading(false);
          return;
        }

        const response = await apiFetch(
          `/parent/child/documents?student_id=${activeId}`,
          {
            method: "GET",
          }
        );

        if (response.success && response.data) {
          setDocuments(
            Array.isArray(response.data) ? response.data : [response.data]
          );
        } else {
          setDocuments([]);
        }
      } catch (e) {
        console.warn("Error fetching documents:", e);
        setDocuments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [params.student_id, selectedStudentId, dashboardData, user]
  );

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDocuments(true);
  }, [loadDocuments]);

  /**
   * In-app View / Preview document (Image modal or PDF/Browser viewer)
   */
  const handlePreviewDocument = async (doc: any) => {
    const rawPath =
      doc.attachments || doc.file_url || doc.file_path || doc.attachment;
    if (!rawPath) {
      Alert.alert("Notice", "Document file link is not available.");
      return;
    }

    const fullUrl = getFileUrl(rawPath);
    const cleanPath = String(rawPath).split("?")[0].toLowerCase();
    const isImage = /\.(jpe?g|png|webp|gif|bmp)$/i.test(cleanPath);
    const title =
      doc.document_type_name ||
      doc.title ||
      doc.file_name ||
      rawPath.split("/").pop() ||
      "Document Preview";

    if (isImage) {
      setPreviewImageDoc({ title, url: fullUrl, doc });
      return;
    }

    setPreviewingId(doc.id);
    try {
      if (Platform.OS === "android" && cleanPath.endsWith(".pdf")) {
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        if (cacheDir) {
          const safeName = `preview_${doc.id || Date.now()}.pdf`;
          const localUri = `${cacheDir}${safeName}`;
          const dl = await FileSystem.downloadAsync(fullUrl, localUri);
          if (dl.status === 200) {
            const contentUri = await FileSystem.getContentUriAsync(dl.uri);
            await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
              data: contentUri,
              flags: 1,
              type: "application/pdf",
            });
            return;
          }
        }
      }
      await WebBrowser.openBrowserAsync(fullUrl);
    } catch {
      await WebBrowser.openBrowserAsync(fullUrl).catch(() => {
        Alert.alert("Preview Error", "Unable to open document preview.");
      });
    } finally {
      setPreviewingId(null);
    }
  };

  /**
   * Direct in-app file download and save/share using expo-file-system and expo-sharing
   */
  const handleDownloadDocument = async (doc: any) => {
    const rawPath =
      doc.attachments || doc.file_url || doc.file_path || doc.attachment;
    if (!rawPath) {
      Alert.alert("Notice", "Document file link is not available.");
      return;
    }

    const fullUrl = getFileUrl(rawPath);
    const fileName = doc.file_name || rawPath.split("/").pop() || "Document.pdf";
    setDownloadingId(doc.id);

    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          const a = document.createElement("a");
          a.href = fullUrl;
          a.download = fileName;
          a.target = "_blank";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }

      const localDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!localDir) {
        throw new Error("Local file storage is not available on this device.");
      }

      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const localUri = `${localDir}${safeFileName}`;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri);

      if (downloadResult.status !== 200) {
        throw new Error(
          `Server returned HTTP ${downloadResult.status}. Unable to download file.`
        );
      }

      const isPdf = safeFileName.toLowerCase().endsWith(".pdf");
      const isPng = safeFileName.toLowerCase().endsWith(".png");
      const isJpg =
        safeFileName.toLowerCase().endsWith(".jpg") ||
        safeFileName.toLowerCase().endsWith(".jpeg");

      const mimeType = isPdf
        ? "application/pdf"
        : isPng
        ? "image/png"
        : isJpg
        ? "image/jpeg"
        : "application/octet-stream";

      if (Platform.OS === "android") {
        let savedViaSaf = false;
        try {
          if (
            FileSystem.StorageAccessFramework?.requestDirectoryPermissionsAsync
          ) {
            const permissions =
              await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions?.granted && permissions?.directoryUri) {
              const base64Data = await FileSystem.readAsStringAsync(
                downloadResult.uri,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              const fileUri =
                await FileSystem.StorageAccessFramework.createFileAsync(
                  permissions.directoryUri,
                  safeFileName,
                  mimeType
                );
              await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              savedViaSaf = true;
              Toast.show({
                type: "success",
                text1: "Download Complete",
                text2: `${fileName} saved to your device folder.`,
              });
            }
          }
        } catch (safErr) {
          console.warn(
            "StorageAccessFramework save failed or cancelled:",
            safErr
          );
        }

        if (!savedViaSaf) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType,
              dialogTitle: `Save or Open ${fileName}`,
              UTI: isPdf ? "com.adobe.pdf" : undefined,
            });
          } else {
            Alert.alert(
              "Success",
              `File downloaded successfully: ${safeFileName}`
            );
          }
        }
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType,
            dialogTitle: `Save or Open ${fileName}`,
            UTI: isPdf ? "com.adobe.pdf" : undefined,
          });
        } else {
          Alert.alert(
            "Success",
            `File downloaded successfully: ${safeFileName}`
          );
        }
      }
    } catch (err: any) {
      console.warn("Download error:", err);
      Alert.alert(
        "Download Error",
        err.message ||
          "Failed to download document. Please check your internet connection."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Documents" isGradient={true} />
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Student Info Summary */}
        <View
          style={[
            styles.studentInfoCard,
            { backgroundColor: colors.cardBg, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}>
            <FileText size={22} color={colors.primary} />
          </View>
          <View style={styles.studentDetails}>
            <Text style={[styles.studentName, { color: colors.text }]}>
              {student
                ? `${student.first_name} ${student.last_name || ""}`.trim()
                : "Student Documents"}
            </Text>
            <Text style={[styles.studentSub, { color: colors.textMuted }]}>
              Class {student?.class_name || "N/A"} -{" "}
              {student?.section_name || "N/A"} | Roll:{" "}
              {student?.roll_number || "N/A"}
            </Text>
          </View>
        </View>

        {/* Category Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Document Vault
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: isDark ? "#064E3B" : "#DCFCE7" },
            ]}
          >
            <ShieldCheck size={12} color={isDark ? "#34D399" : "#15803D"} />
            <Text
              style={[
                styles.badgeText,
                { color: isDark ? "#34D399" : "#15803D" },
              ]}
            >
              {documents.length} Verified{" "}
              {documents.length === 1 ? "File" : "Files"}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading documents repository...
            </Text>
          </View>
        ) : documents.length > 0 ? (
          <View style={styles.documentList}>
            {documents.map((doc) => {
              const isDownloading = downloadingId === doc.id;
              const isPreviewing = previewingId === doc.id;
              const fileName =
                doc.file_name || doc.attachments?.split("/").pop() || "Document";

              return (
                <View
                  key={doc.id}
                  style={[
                    styles.docCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.docTopRow}>
                    <View
                      style={[
                        styles.docIconWrapper,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <File size={22} color={colors.primary} />
                    </View>

                    <View style={styles.docInfo}>
                      <Text style={[styles.docTypeTitle, { color: colors.text }]}>
                        {doc.document_type_name || doc.title || fileName}
                      </Text>
                      <Text
                        style={[styles.docFileName, { color: colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {fileName}
                      </Text>
                      <View style={styles.docDateRow}>
                        <Calendar size={11} color={colors.textMuted} />
                        <Text
                          style={[
                            styles.docDateText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {doc.created_at
                            ? String(doc.created_at).split(" ")[0].split("T")[0]
                            : "Uploaded"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.docActionsRow,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    {/* View / Preview Action */}
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handlePreviewDocument(doc)}
                      disabled={isPreviewing}
                      activeOpacity={0.75}
                    >
                      {isPreviewing ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.textSecondary}
                        />
                      ) : (
                        <View style={styles.downloadInner}>
                          <Eye size={15} color={colors.text} />
                          <Text
                            style={[styles.downloadLabel, { color: colors.text }]}
                          >
                            View
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Download Action */}
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                      onPress={() => handleDownloadDocument(doc)}
                      disabled={isDownloading}
                      activeOpacity={0.8}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <View style={styles.downloadInner}>
                          <Download size={15} color="#FFFFFF" />
                          <Text style={[styles.downloadLabel, { color: "#FFFFFF" }]}>
                            Download
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.mainCard,
              { backgroundColor: colors.cardBg, borderColor: colors.border },
            ]}
          >
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Documents Uploaded
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Official certificates, report cards, and identity documents issued
              by the school administration will appear here.
            </Text>

            <TouchableOpacity
              onPress={onRefresh}
              style={[
                styles.refreshBtn,
                { backgroundColor: colors.primaryLight, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
            >
              <FileCheck size={16} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>
                Check for Updates
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* In-App Image Preview Modal */}
      <Modal
        visible={!!previewImageDoc}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageDoc(null)}
      >
        <View
          style={[
            styles.previewBackdrop,
            { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <View style={styles.previewTopBar}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {previewImageDoc?.title || "Document Preview"}
            </Text>
            <TouchableOpacity
              onPress={() => setPreviewImageDoc(null)}
              style={styles.previewCloseBtn}
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.previewImageBody}>
            {previewImageDoc?.url ? (
              <Image
                source={{ uri: previewImageDoc.url }}
                style={styles.previewFullImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {previewImageDoc?.doc && (
            <TouchableOpacity
              style={[styles.previewDownloadBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                const targetDoc = previewImageDoc.doc;
                setPreviewImageDoc(null);
                handleDownloadDocument(targetDoc);
              }}
            >
              <Download size={16} color="#FFFFFF" />
              <Text style={styles.previewDownloadText}>Download Document</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default Document;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  studentInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  studentSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  documentList: {
    gap: 12,
    paddingBottom: 24,
  },
  docCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  docTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docTypeTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  docFileName: {
    fontSize: 12,
  },
  docDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  docDateText: {
    fontSize: 11,
    fontWeight: "500",
  },
  docActionsRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  downloadInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  mainCard: {
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 10,
  },
  lottie: {
    width: 140,
    height: 140,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.92)",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  previewTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
  },
  previewTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  previewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImageBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewFullImage: {
    width: "100%",
    height: "85%",
  },
  previewDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  previewDownloadText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
