import SubHeader from "@/components/dashboard/SubHeader";
import LottieView from "lottie-react-native";
import { FileText, ShieldCheck, FileCheck, Calendar, File, Download, CheckCircle2 } from "lucide-react-native";
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
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useAppTheme } from "@/theme";
import { apiFetch, getFileUrl, resolveStudentId } from "@/services/apiClient";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";

const Document = () => {
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);
  const student = dashboardData?.student_details;

  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  const loadDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      if (!activeId) {
        setLoading(false);
        return;
      }

      const response = await apiFetch(`/parent/child/documents?student_id=${activeId}`, {
        method: "GET",
      });

      if (response.success && response.data) {
        setDocuments(Array.isArray(response.data) ? response.data : [response.data]);
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
  }, [params.student_id, selectedStudentId, dashboardData, user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDocuments(true);
  }, [loadDocuments]);

  /**
   * Direct in-app file download and save/share using expo-file-system and expo-sharing
   */
  const handleDownloadDocument = async (doc: any) => {
    const rawPath = doc.attachments || doc.file_url || doc.file_path || doc.attachment;
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

      // 1. Download file to local document/cache storage
      const localDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!localDir) {
        throw new Error("Local file storage is not available on this device.");
      }

      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const localUri = `${localDir}${safeFileName}`;

      const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Server returned HTTP ${downloadResult.status}. Unable to download file.`);
      }

      const isPdf = safeFileName.toLowerCase().endsWith(".pdf");
      const isPng = safeFileName.toLowerCase().endsWith(".png");
      const isJpg = safeFileName.toLowerCase().endsWith(".jpg") || safeFileName.toLowerCase().endsWith(".jpeg");

      const mimeType = isPdf
        ? "application/pdf"
        : isPng
        ? "image/png"
        : isJpg
        ? "image/jpeg"
        : "application/octet-stream";

      // 2. Android: Use Storage Access Framework (SAF) to save directly to selected folder (e.g. Downloads)
      if (Platform.OS === "android") {
        let savedViaSaf = false;
        try {
          if (FileSystem.StorageAccessFramework?.requestDirectoryPermissionsAsync) {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions?.granted && permissions?.directoryUri) {
              const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
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
          console.warn("StorageAccessFramework save failed or cancelled:", safErr);
        }

        // If user cancelled folder picker or SAF failed, fallback to native sharing/save dialog
        if (!savedViaSaf) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType,
              dialogTitle: `Save or Open ${fileName}`,
              UTI: isPdf ? "com.adobe.pdf" : undefined,
            });
          } else {
            Alert.alert("Success", `File downloaded successfully: ${safeFileName}`);
          }
        }
      } else {
        // iOS: Native share allows "Save to Files" (standard iOS way to save to Files/iCloud)
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType,
            dialogTitle: `Save or Open ${fileName}`,
            UTI: isPdf ? "com.adobe.pdf" : undefined,
          });
        } else {
          Alert.alert("Success", `File downloaded successfully: ${safeFileName}`);
        }
      }
    } catch (err: any) {
      console.warn("Download error:", err);
      Alert.alert(
        "Download Error",
        err.message || "Failed to download document. Please check your internet connection."
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
        <View style={[styles.studentInfoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.badgeBg }]}>
            <FileText size={22} color={colors.primary} />
          </View>
          <View style={styles.studentDetails}>
            <Text style={[styles.studentName, { color: colors.text }]}>
              {student ? `${student.first_name} ${student.last_name || ""}`.trim() : "Student Documents"}
            </Text>
            <Text style={[styles.studentSub, { color: colors.textMuted }]}>
              Class {student?.class_name || "N/A"} - {student?.section_name || "N/A"} | Roll: {student?.roll_number || "N/A"}
            </Text>
          </View>
        </View>

        {/* Category Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Document Vault</Text>
          <View style={[styles.badge, { backgroundColor: isDark ? "#064E3B" : "#DCFCE7" }]}>
            <ShieldCheck size={12} color={isDark ? "#34D399" : "#15803D"} />
            <Text style={[styles.badgeText, { color: isDark ? "#34D399" : "#15803D" }]}>
              {documents.length} Verified {documents.length === 1 ? "File" : "Files"}
            </Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading documents repository...</Text>
          </View>
        ) : documents.length > 0 ? (
          <View style={styles.documentList}>
            {documents.map((doc) => {
              const isDownloading = downloadingId === doc.id;
              const fileName = doc.file_name || doc.attachments?.split("/").pop() || "Document";

              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.docCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
                  onPress={() => handleDownloadDocument(doc)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.docIconWrapper, { backgroundColor: colors.primaryLight }]}>
                    <File size={22} color={colors.primary} />
                  </View>

                  <View style={styles.docInfo}>
                    <Text style={[styles.docTypeTitle, { color: colors.text }]}>
                      {doc.document_type_name || doc.title || fileName}
                    </Text>
                    <Text style={[styles.docFileName, { color: colors.textMuted }]} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <View style={styles.docDateRow}>
                      <Calendar size={11} color={colors.textMuted} />
                      <Text style={[styles.docDateText, { color: colors.textSecondary }]}>
                        {doc.created_at ? doc.created_at.split(" ")[0] : "Uploaded"}
                      </Text>
                    </View>
                  </View>

                  {/* Download Action Button */}
                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
                    onPress={() => handleDownloadDocument(doc)}
                    disabled={isDownloading}
                    activeOpacity={0.7}
                  >
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View style={styles.downloadInner}>
                        <Download size={16} color={colors.primary} />
                        <Text style={[styles.downloadLabel, { color: colors.primary }]}>Download</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          /* Empty / Repository Card - Genuine empty state */
          <View style={[styles.mainCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <LottieView
              autoPlay
              style={styles.lottie}
              source={require("@/assets/lottiefiles/empty_state.json")}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Documents Uploaded</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Official certificates, report cards, and identity documents issued by the school administration will appear here.
            </Text>

            <TouchableOpacity
              onPress={onRefresh}
              style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <FileCheck size={16} color={colors.primary} />
              <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Check for Updates</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
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
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 84,
  },
  downloadInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  downloadLabel: {
    fontSize: 12,
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
});
