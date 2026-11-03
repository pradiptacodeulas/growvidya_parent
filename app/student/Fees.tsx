import SubHeader from "@/components/dashboard/SubHeader";
import { useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchDashboardData } from "@/redux/home/homeThunk";
import { useAppTheme } from "@/theme";
import { fetchWithTimeout, safeParseJson } from "@/utils/api";
import { apiFetch, getAvatarUrl, getFileUrl, getServerBaseUrl, resolveStudentId } from "@/services/apiClient";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileText,
  GraduationCap,
  IdCard,
  IndianRupee,
  Receipt,
  Sparkles,
  Wallet,
  X,
  Layers,
  Copy,
  Check,
  UploadCloud,
  Camera,
  Image as ImageIcon,
  Building2,
  QrCode,
  Maximize2,
  Trash2,
  FileCheck,
  User,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import Toast from "react-native-toast-message";

const { width } = Dimensions.get("window");

export default function FeesScreen() {
  const params = useLocalSearchParams<{ student_id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const { dashboardData, selectedStudentId } = useSelector((state: RootState) => state.home);

  const [activeTab, setActiveTab] = useState<"DUE_MONTH" | "ALL_DUE" | "PAID">("DUE_MONTH");
  const [loading, setLoading] = useState(!dashboardData?.student_due_fees && !dashboardData?.fees);
  const [refreshing, setRefreshing] = useState(false);
  const [feesData, setFeesData] = useState<any>(() => {
    if (dashboardData) {
      const allInvoices = dashboardData.invoices || [];
      const dueFeesList =
        dashboardData.due_this_month ||
        dashboardData.student_due_fees ||
        dashboardData.dueFees ||
        allInvoices.filter(
          (i: any) =>
            i.status !== "Paid" &&
            i.status !== "paid" &&
            parseFloat(i.due_amount || 0) > 0
        );
      const paidFeesList = dashboardData.paidFees || [];
      const summary = dashboardData.fees || dashboardData.summary || {
        totalDue: 0,
        totalDueThisMonth: 0,
        totalPaid: 0,
      };

      if (dueFeesList.length > 0 || paidFeesList.length > 0 || allInvoices.length > 0) {
        return {
          student_details: dashboardData.student_details || dashboardData.activeChild,
          metrics: {
            total_due_amount: summary.totalDue !== undefined ? summary.totalDue : (summary.totalOutstandingDue || 0),
            total_due_this_month: summary.totalDueThisMonth !== undefined ? summary.totalDueThisMonth : (summary.totalDue || 0),
            total_paid_amount: summary.totalPaid || 0,
          },
          due_this_month: dueFeesList,
          student_due_fees: dueFeesList,
          student_paid_fees: paidFeesList,
          invoices: allInvoices,
          bank_details: dashboardData.bank_details || null,
        };
      }
    }
    return null;
  });
  
  // Details Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [modalType, setModalType] = useState<"INVOICE" | "RECEIPT">("INVOICE");
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);

  // Pay & Receipt Upload BottomSheet State
  const payBottomSheetRef = useRef<BottomSheetModal>(null);
  const paySnapPoints = useMemo(() => ["90%"], []);
  const [selectedPayInvoice, setSelectedPayInvoice] = useState<any>(null);
  const [receiptAsset, setReceiptAsset] = useState<any>(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI / QR Code");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrZoomVisible, setQrZoomVisible] = useState(false);

  const renderPayBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const [payLoading, setPayLoading] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | number | null>(null);

  const currentStudent = dashboardData?.student_details || dashboardData?.activeChild || user?.activeChild || user?.children?.[0];
  const student = feesData?.student_details || currentStudent;

  const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);

  useEffect(() => {
    if (!targetStudentId && !dashboardData) {
      dispatch(fetchDashboardData());
    }
  }, [targetStudentId, dashboardData, dispatch]);

  // Seed from dashboardData whenever it updates and feesData is not yet populated
  useEffect(() => {
    if (!feesData && dashboardData) {
      const allInvoices = dashboardData.invoices || [];
      const dueFeesList =
        dashboardData.due_this_month ||
        dashboardData.student_due_fees ||
        dashboardData.dueFees ||
        allInvoices.filter(
          (i: any) =>
            i.status !== "Paid" &&
            i.status !== "paid" &&
            parseFloat(i.due_amount || 0) > 0
        );
      const paidFeesList = dashboardData.paidFees || [];
      const summary = dashboardData.fees || dashboardData.summary || {
        totalDue: 0,
        totalDueThisMonth: 0,
        totalPaid: 0,
      };

      if (dueFeesList.length > 0 || paidFeesList.length > 0 || allInvoices.length > 0) {
        setFeesData({
          student_details: currentStudent,
          metrics: {
            total_due_amount: summary.totalDue !== undefined ? summary.totalDue : (summary.totalOutstandingDue || 0),
            total_due_this_month: summary.totalDueThisMonth !== undefined ? summary.totalDueThisMonth : (summary.totalDue || 0),
            total_paid_amount: summary.totalPaid || 0,
          },
          due_this_month: dueFeesList,
          student_due_fees: dueFeesList,
          student_paid_fees: paidFeesList,
          invoices: allInvoices,
          bank_details: dashboardData.bank_details || null,
        });

        if (dueFeesList.length === 0 && paidFeesList.length > 0) {
          setActiveTab("PAID");
        }
      }
    }
  }, [dashboardData, feesData, currentStudent]);

  const loadFees = useCallback(async (isSilent = false) => {
    if (!isSilent && !feesData) setLoading(true);
    try {
      const activeId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
      const endpoint = activeId ? `/parent/child/fees?student_id=${activeId}` : `/parent/child/fees`;

      const response = await apiFetch(endpoint, {
        method: "GET",
      });

      if (response.success && response.data) {
        const payload = response.data;
        const allInvoices = payload.invoices || [];
        const dueFeesList = payload.dueFees || allInvoices.filter((i: any) => i.status !== "Paid" && i.status !== "paid" && parseFloat(i.due_amount || 0) > 0);
        const paidFeesList = payload.paidFees || [];
        const summary = payload.summary || payload.metrics || {
          totalDue: 0,
          totalDueThisMonth: 0,
          totalPaid: 0,
        };

        setFeesData({
          student_details: payload.student_details || currentStudent,
          metrics: {
            total_due_amount: summary.totalDue !== undefined ? summary.totalDue : (summary.totalOutstandingDue || 0),
            total_due_this_month: summary.totalDueThisMonth !== undefined ? summary.totalDueThisMonth : (summary.totalDue || 0),
            total_paid_amount: summary.totalPaid || 0,
          },
          due_this_month: dueFeesList,
          student_due_fees: dueFeesList,
          student_paid_fees: paidFeesList,
          invoices: allInvoices,
          bank_details: payload.bank_details || null,
        });

        if (dueFeesList.length === 0 && paidFeesList.length > 0) {
          setActiveTab((prev) => (prev === "DUE_MONTH" ? "PAID" : prev));
        }
      } else if (!feesData) {
        setFeesData(null);
      }
    } catch (e) {
      console.warn("Failed to fetch fees API:", e);
      if (!feesData) setFeesData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.student_id, selectedStudentId, dashboardData, user, currentStudent, feesData]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFees(true);
  }, [loadFees]);

  const metrics = feesData?.metrics || {
    total_due_amount: 0,
    total_due_this_month: 0,
    total_paid_amount: 0,
  };
  const dueThisMonth = feesData?.due_this_month || [];
  const allDueFees = feesData?.student_due_fees || [];
  const paidFees = feesData?.student_paid_fees || [];

  const getPictureUrl = () => {
    if (!student?.picture) return null;
    return getAvatarUrl(student.picture, student?.gender);
  };

  const handleOpenDetails = (invoice: any, type: "INVOICE" | "RECEIPT" = "INVOICE") => {
    setSelectedInvoice(invoice);
    setModalType(type);
    setDetailModalVisible(true);
    setDetailsLoading(false);

    setInvoiceDetails({
      id: invoice.id,
      receipt_no: invoice.receipt_no || (type === "RECEIPT" ? `REC-${invoice.id}` : undefined),
      txn_no: invoice.txn_no,
      reference_no: invoice.reference_no,
      payment_method: invoice.payment_method || invoice.payment_mode_name,
      payment_date: invoice.payment_date,
      invoice_no: invoice.invoice_no || `INV-${invoice.id}`,
      title: invoice.title || invoice.period || invoice.invoice_title || "School Fees",
      subtotal: invoice.subtotal || invoice.total_amount || invoice.amount || "0.00",
      concession_amount: invoice.concession_amount || "0.00",
      late_fee_amount: invoice.late_fee_amount || "0.00",
      total_amount: invoice.total_amount || invoice.amount || "0.00",
      paid_amount: invoice.paid_amount || (type === "RECEIPT" ? invoice.amount_paid || invoice.amount : "0.00"),
      due_amount: invoice.due_amount || (type === "RECEIPT" ? "0.00" : invoice.total_amount || "0.00"),
      issue_date: invoice.issue_date || invoice.payment_date || "N/A",
      due_date: invoice.due_date || invoice.last_date || "N/A",
      status: invoice.status || (type === "RECEIPT" ? "paid" : "unpaid"),
      receipt_file: invoice.receipt_file || null,
      items: invoice.items || [],
      payments: type === "RECEIPT" ? [
        {
          id: invoice.id,
          txn_no: invoice.txn_no,
          receipt_no: invoice.receipt_no,
          amount_paid: invoice.amount_paid || invoice.amount,
          payment_method: invoice.payment_method || invoice.payment_mode_name || "Online Transfer",
          reference_no: invoice.reference_no,
          payment_date: invoice.payment_date,
          status: invoice.status,
          receipt_file: invoice.receipt_file || null,
          notes: invoice.notes,
        }
      ] : [],
    });
  };

  const handleOpenPayModal = (invoice: any) => {
    const amountToPay = parseFloat(invoice.due_amount || invoice.total_amount || invoice.fees || "0");
    if (amountToPay <= 0) {
      Toast.show({
        type: "info",
        text1: "Fee Already Paid",
        text2: "This fee invoice has already been cleared.",
      });
      return;
    }

    if (invoice.status === "Pending Verification") {
      Toast.show({
        type: "info",
        text1: "Verification in Progress",
        text2: "A payment receipt for this fee has already been submitted and is awaiting school verification.",
      });
      return;
    }

    setSelectedPayInvoice(invoice);
    setReceiptAsset(null);
    setReferenceNo("");
    setPaymentNotes("");
    setPaymentMethod("UPI / QR Code");
    setTimeout(() => {
      payBottomSheetRef.current?.present();
    }, 50);
  };

  const handlePayNow = (invoice: any) => {
    handleOpenPayModal(invoice);
  };

  const handleCopyText = async (text: string, fieldKey: string, label: string) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(String(text).trim());
      setCopiedField(fieldKey);
      Toast.show({
        type: "info",
        text1: "Copied to Clipboard",
        text2: `${label} copied successfully.`,
        visibilityTime: 1800,
      });
      setTimeout(() => setCopiedField(null), 2500);
    } catch (e) {
      console.warn("Clipboard error:", e);
    }
  };

  const handlePickReceipt = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant media library access to select and upload your fee payment receipt."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptAsset(result.assets[0]);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Picker Error",
        text2: err?.message || "Could not select receipt image.",
      });
    }
  };

  const handleTakeReceiptPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant camera access to take a photo of your payment receipt."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReceiptAsset(result.assets[0]);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Camera Error",
        text2: err?.message || "Could not capture receipt photo.",
      });
    }
  };

  const handleSubmitPaymentVerification = async () => {
    if (!selectedPayInvoice) return;

    const targetStudentId = resolveStudentId(params.student_id, selectedStudentId, dashboardData, user);
    const amountToPay = parseFloat(
      selectedPayInvoice.due_amount || selectedPayInvoice.total_amount || selectedPayInvoice.fees || "0"
    );

    if (amountToPay <= 0) {
      Toast.show({
        type: "info",
        text1: "Fee Already Paid",
        text2: "This fee invoice has already been cleared.",
      });
      return;
    }

    if (!receiptAsset) {
      Toast.show({
        type: "error",
        text1: "Receipt Proof Required",
        text2: "Please upload your payment screenshot or receipt before submitting.",
      });
      return;
    }

    setSubmittingPayment(true);
    try {
      // 1. Upload receipt to server
      const uri = receiptAsset.uri;
      const uriParts = uri.split(".");
      const fileExt = (uriParts[uriParts.length - 1] || "jpg").toLowerCase().split("?")[0];
      const fileName = receiptAsset.fileName || `fee_receipt_${Date.now()}.${fileExt}`;
      const mimeType = receiptAsset.mimeType || (fileExt === "png" ? "image/png" : "image/jpeg");

      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
        name: fileName,
        type: mimeType,
      } as any);

      const uploadRes = await apiFetch("/upload/single?folder=fees", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.success || !uploadRes.data?.file_path) {
        throw new Error(uploadRes.message || "Failed to upload payment receipt file.");
      }

      const receiptFilePath = uploadRes.data.file_path;

      // 2. Submit payment record with receipt
      const bankDetails = feesData?.bank_details;
      const payRes = await apiFetch("/parent/child/fees/pay", {
        method: "POST",
        body: JSON.stringify({
          student_id: Number(targetStudentId),
          invoiceId: Number(selectedPayInvoice.id),
          amountPaid: amountToPay,
          paymentMethod: paymentMethod || "UPI / QR Code",
          referenceNo: referenceNo.trim() || `TXN-P-${Date.now()}`,
          bankName: bankDetails?.bank_name || null,
          receiptFile: receiptFilePath,
          notes: paymentNotes.trim() || `Receipt uploaded for ${selectedPayInvoice.title || "School Fees"}`,
        }),
      });

      if (payRes.success) {
        Toast.show({
          type: "success",
          text1: "Receipt Submitted for Verification 🎉",
          text2: "Your payment has been submitted and is pending school verification.",
        });
        payBottomSheetRef.current?.dismiss();
        setReceiptAsset(null);
        setReferenceNo("");
        setPaymentNotes("");
        loadFees(true);
      } else {
        Toast.show({
          type: "error",
          text1: "Submission Failed",
          text2: payRes.message || "Could not submit payment record.",
        });
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Submission Error",
        text2: err?.message || "An unexpected error occurred during submission.",
      });
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Helper to convert number to words (Indian Numbering System format)
  const numberToWords = (amount: number): string => {
    if (!amount || isNaN(amount) || amount <= 0) return "Zero Rupees";
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
      if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convert(n % 100) : "");
      if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
      if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
      return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "");
    };

    const intVal = Math.floor(amount);
    const decVal = Math.round((amount - intVal) * 100);
    
    let res = convert(intVal).trim();
    if (decVal > 0) {
      res += ` Rupees and ${convert(decVal).trim()} Paise`;
    } else {
      res += ` Rupees`;
    }
    return res + " Only";
  };

  const formatReceiptDate = (dateStr: any): string => {
    if (!dateStr) return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return String(dateStr);
      }
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleDownloadReceipt = async (receipt: any) => {
    const receiptKey = receipt.id || receipt.receipt_no || "REC";
    setDownloadingReceiptId(receiptKey);

    try {
      const rawPaid =
        receipt.amount_paid ||
        receipt.paid_amount ||
        receipt.amount ||
        receipt.fees_amount ||
        receipt.total_amount ||
        0;
      const paidAmount = parseFloat(String(rawPaid)) || 0;
      const firstPmt = receipt.payments?.[0];
      const receiptNo =
        receipt.receipt_no ||
        firstPmt?.receipt_no ||
        (receipt.id ? `REC-${receipt.id}` : `REC-${Date.now().toString().slice(-6)}`);
      const txnNo = receipt.txn_no || firstPmt?.txn_no || receipt.transaction_no || "N/A";
      const refNo = receipt.reference_no || firstPmt?.reference_no || "N/A";
      const paymentMethod =
        receipt.payment_method ||
        firstPmt?.payment_method ||
        receipt.payment_mode_name ||
        "Online Transfer / UPI";
      const paymentDate =
        receipt.payment_date ||
        firstPmt?.payment_date ||
        receipt.created_at ||
        receipt.issue_date ||
        new Date().toISOString();
      const formattedDate = formatReceiptDate(paymentDate);
      const amountInWords = numberToWords(paidAmount);
      const schoolName =
        dashboardData?.parent?.schoolName ||
        (user as any)?.school_name ||
        "Growvidya Public School";
      const serverBaseUrl = getServerBaseUrl();
      const logoUrl = `${serverBaseUrl}/vidya_assets/images/school-logo.png`;

      const matchingInvoice = feesData?.invoices?.find(
        (inv: any) => inv.id === receipt.invoice_id || inv.id === receipt.id
      );

      const feeComponents =
        receipt.items && receipt.items.length > 0
          ? receipt.items
          : matchingInvoice?.items && matchingInvoice.items.length > 0
          ? matchingInvoice.items
          : [
              {
                component_name:
                  receipt.invoice_title ||
                  receipt.title ||
                  receipt.period ||
                  matchingInvoice?.title ||
                  "School Tuition & Academic Fees",
                amount: paidAmount,
              },
            ];

      const studentFullName = student
        ? `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student"
        : "Student";
      const studentAdmNo = student?.admission_number || "N/A";
      const studentClass = `${student?.class_name || "N/A"}${student?.section_name ? ` (${student.section_name})` : ""}`;
      const studentRoll = student?.roll_number || "N/A";
      const parentName =
        student?.father_name ||
        student?.guardian_name ||
        (user as any)?.name ||
        "Parent/Guardian";

      Toast.show({
        type: "info",
        text1: "Preparing Receipt",
        text2: `Generating PDF receipt ${receiptNo}...`,
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Fee Receipt - ${receiptNo}</title>
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1f2937;
              margin: 0;
              padding: 24px;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
            }
            .receipt-box {
              border: 2px solid #059669;
              border-radius: 12px;
              padding: 24px;
              max-width: 750px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e5e7eb;
              margin-bottom: 18px;
              padding-bottom: 14px;
            }
            .school-logo {
              max-height: 55px;
              margin-bottom: 6px;
              object-fit: contain;
            }
            .school-name {
              margin: 0 0 4px 0;
              font-size: 22px;
              color: #111827;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .school-sub {
              margin: 0 0 10px 0;
              font-size: 12px;
              color: #6b7280;
            }
            .badge-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 10px;
            }
            .receipt-title {
              font-size: 16px;
              color: #059669;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin: 0;
            }
            .paid-badge {
              background-color: #d1fae5;
              color: #065f46;
              border: 1.5px solid #059669;
              border-radius: 6px;
              padding: 4px 14px;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
              margin-bottom: 14px;
            }
            .table td, .table th {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              font-size: 12px;
            }
            .meta-label {
              background-color: #f9fafb;
              font-weight: 600;
              color: #4b5563;
              width: 22%;
            }
            .meta-val {
              color: #111827;
              width: 28%;
            }
            .table-header {
              background-color: #059669;
              color: #ffffff;
              font-weight: 700;
            }
            .table-header th {
              color: #ffffff;
              border-color: #059669;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .total-row td {
              font-size: 13px;
              font-weight: 800;
              background-color: #ecfdf5;
              color: #065f46;
              border-top: 2px solid #059669;
            }
            .words-box {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 14px;
              margin-top: 12px;
              font-size: 12px;
            }
            .words-box strong {
              color: #475569;
            }
            .footer {
              margin-top: 36px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .terms {
              font-size: 10px;
              color: #6b7280;
              line-height: 1.4;
              max-width: 60%;
            }
            .signature {
              text-align: center;
              border-top: 1px solid #9ca3af;
              padding-top: 6px;
              font-size: 11px;
              font-weight: 600;
              color: #4b5563;
              width: 180px;
            }
            .note {
              font-size: 10px;
              color: #9ca3af;
              margin-top: 16px;
              text-align: center;
              border-top: 1px dashed #e5e7eb;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <img src="${logoUrl}" class="school-logo" alt="School Logo" onerror="this.style.display='none'" />
              <h1 class="school-name">${schoolName}</h1>
              <p class="school-sub">Official Student Fee Payment Receipt • Generated via Parent Portal</p>
              <div class="badge-row">
                <h2 class="receipt-title">FEE RECEIPT</h2>
                <span class="paid-badge">PAID</span>
              </div>
            </div>

            <!-- Transaction & Receipt Metadata -->
            <table class="table">
              <tr>
                <td class="meta-label">Receipt No:</td>
                <td class="meta-val"><strong>${receiptNo}</strong></td>
                <td class="meta-label">Payment Date:</td>
                <td class="meta-val">${formattedDate}</td>
              </tr>
              <tr>
                <td class="meta-label">Transaction ID:</td>
                <td class="meta-val">${txnNo}</td>
                <td class="meta-label">Payment Mode:</td>
                <td class="meta-val">${paymentMethod}</td>
              </tr>
              <tr>
                <td class="meta-label">Reference / UTR:</td>
                <td class="meta-val">${refNo}</td>
                <td class="meta-label">Status:</td>
                <td class="meta-val"><strong style="color: #059669;">Successful</strong></td>
              </tr>
            </table>

            <!-- Student & Academic Metadata -->
            <table class="table">
              <tr>
                <td class="meta-label">Student Name:</td>
                <td class="meta-val"><strong>${studentFullName}</strong></td>
                <td class="meta-label">Admission No:</td>
                <td class="meta-val">${studentAdmNo}</td>
              </tr>
              <tr>
                <td class="meta-label">Class & Section:</td>
                <td class="meta-val">${studentClass}</td>
                <td class="meta-label">Roll Number:</td>
                <td class="meta-val">${studentRoll}</td>
              </tr>
              <tr>
                <td class="meta-label">Parent / Guardian:</td>
                <td class="meta-val">${parentName}</td>
                <td class="meta-label">Fee Title:</td>
                <td class="meta-val">${receipt.invoice_title || receipt.title || receipt.period || "School Fees"}</td>
              </tr>
            </table>

            <!-- Fee Components Table -->
            <table class="table">
              <thead>
                <tr class="table-header">
                  <th class="text-center" style="width: 10%;">#</th>
                  <th style="width: 65%;">Fee Component / Particulars</th>
                  <th class="text-right" style="width: 25%;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${feeComponents
                  .map(
                    (item: any, idx: number) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td>${item.component_name || item.name || "Fee Component"}</td>
                    <td class="text-right">₹${parseFloat(String(item.amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  </tr>
                `
                  )
                  .join("")}
                <tr class="total-row">
                  <td colspan="2" class="text-right">TOTAL AMOUNT PAID:</td>
                  <td class="text-right">₹${paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <!-- Amount in words -->
            <div class="words-box">
              <strong>Amount in Words:</strong> ${amountInWords}
            </div>

            <!-- Signatures & Notes -->
            <div class="footer">
              <div class="terms">
                <strong>Notes:</strong><br />
                1. This is an authentic computer-generated digital receipt.<br />
                2. Fees once paid are subject to school terms and regulations.<br />
                3. Please retain this receipt for your records.
              </div>
              <div class="signature">
                Authorized Cashier / Accountant<br />
                <small style="color: #9ca3af;">Accounts Department</small>
              </div>
            </div>

            <div class="note">
              Generated by Growvidya Mobile App for Parents • Official Record
            </div>
          </div>
        </body>
        </html>
      `;

      // 1. Generate PDF file via expo-print
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // 2. Platform-specific handling:
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          await Print.printAsync({ html: htmlContent });
        }
        return;
      }

      // Android: Direct native document open with default PDF viewer
      if (Platform.OS === "android") {
        try {
          const contentUri = await FileSystem.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
            data: contentUri,
            flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
            type: "application/pdf",
          });
          Toast.show({
            type: "success",
            text1: "Receipt Downloaded 🎉",
            text2: `Opened fee receipt ${receiptNo}`,
          });
          return;
        } catch (intentErr) {
          console.warn("Intent direct open failed, falling back to Share:", intentErr);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: "application/pdf",
              dialogTitle: `Fee Receipt - ${receiptNo}`,
              UTI: "com.adobe.pdf",
            });
            return;
          }
        }
      }

      // iOS: Open native preview/share sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Fee Receipt - ${receiptNo}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Receipt Downloaded 🎉",
          text2: `Saved receipt ${receiptNo}`,
        });
      }
    } catch (err: any) {
      console.error("Failed to generate or download receipt:", err);
      Toast.show({
        type: "error",
        text1: "Download Failed",
        text2: err?.message || "Could not generate PDF receipt. Please try again.",
      });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const activeDetails = invoiceDetails || selectedInvoice;

  if (loading && !feesData) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Fees & Payments" isGradient={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* --- STUDENT PROFILE BANNER CARD --- */}
        <LinearGradient
          colors={isDark ? ["#1E293B", "#0F172A"] : ["#1E293B", "#334155"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileBannerCard}
        >
          <View style={styles.bannerRow}>
            <View style={styles.avatarBorder}>
              {getPictureUrl() ? (
                <Image source={{ uri: getPictureUrl()! }} style={styles.bannerAvatar} />
              ) : (
                <View style={styles.bannerAvatarPlaceholder}>
                  <Text style={styles.avatarInitialText}>
                    {student?.first_name ? student.first_name.charAt(0) : "S"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.bannerInfo}>
              <View style={styles.admBadge}>
                <IdCard size={11} color="#60A5FA" style={{ marginRight: 4 }} />
                <Text style={styles.admBadgeText}>
                  Adm. No: {student?.admission_number || "N/A"}
                </Text>
              </View>

              <Text style={styles.bannerStudentName}>
                {student ? `${student.first_name || ""} ${student.last_name || ""}`.trim() || "Student" : "Student"}
              </Text>

              <View style={styles.subMetaRow}>
                <View style={styles.subMetaItem}>
                  <GraduationCap size={13} color="#FBBF24" style={{ marginRight: 4 }} />
                  <Text style={styles.subMetaLabel}>Class: </Text>
                  <Text style={styles.subMetaVal}>
                    {student?.class_name || "N/A"}{student?.section_name ? ` (${student.section_name})` : ""}
                  </Text>
                </View>

                <View style={styles.subMetaItem}>
                  <Text style={styles.subMetaLabel}>Roll No: </Text>
                  <Text style={styles.subMetaVal}>{student?.roll_number || "N/A"}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* --- FEE METRIC OVERVIEW CARDS (GRID WITH HOLOGRAM ICONS) --- */}
        <View style={styles.metricsGrid}>
          {/* Total Outstanding Due */}
          <LinearGradient
            colors={["#EF4444", "#DC2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCardHalf}
          >
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel} numberOfLines={1}>OUTSTANDING DUE</Text>
              <Text style={styles.metricAmountGrid}>
                ₹{parseFloat(metrics.total_due_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </Text>
              <Text style={styles.metricSubtext} numberOfLines={1}>Pending invoices</Text>
            </View>
            <View style={styles.hologramContainer}>
              <IndianRupee size={85} color="rgba(255, 255, 255, 0.2)" />
            </View>
          </LinearGradient>

          {/* Due This Month */}
          <LinearGradient
            colors={["#F59E0B", "#D97706"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCardHalf}
          >
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel} numberOfLines={1}>DUE THIS MONTH</Text>
              <Text style={styles.metricAmountGrid}>
                ₹{parseFloat(metrics.total_due_this_month || "0").toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </Text>
              <Text style={styles.metricSubtext} numberOfLines={1}>Immediate month</Text>
            </View>
            <View style={styles.hologramContainer}>
              <Bell size={85} color="rgba(255, 255, 255, 0.2)" /> 
            </View>
          </LinearGradient>

          {/* Total Fees Paid */}
          <LinearGradient
            colors={["#10B981", "#059669"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricCardFull}
          >
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>TOTAL FEES PAID</Text>
              <Text style={styles.metricAmount}>
                ₹{parseFloat(metrics.total_paid_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.metricSubtext}>Cleared fee payments</Text>
            </View>
            <View style={styles.hologramContainer}>
              <CheckCircle2 size={95} color="rgba(255, 255, 255, 0.2)" />
            </View>
          </LinearGradient>
        </View>

        {/* --- NAVIGATION TABS --- */}
        <View style={[styles.tabBarCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {/* Tab 1: Due This Month */}
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "DUE_MONTH" && [styles.activeTabBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.primary }],
              ]}
              onPress={() => setActiveTab("DUE_MONTH")}
              activeOpacity={0.8}
            >
              <AlertCircle size={15} color="#F59E0B" style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "DUE_MONTH" ? colors.primary : colors.textSecondary },
                ]}
              >
                Due This Month
              </Text>
              {dueThisMonth.length > 0 && (
                <View style={styles.tabBadgeAmber}>
                  <Text style={styles.tabBadgeAmberText}>{dueThisMonth.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Tab 2: All Pending Invoices */}
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "ALL_DUE" && [styles.activeTabBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.primary }],
              ]}
              onPress={() => setActiveTab("ALL_DUE")}
              activeOpacity={0.8}
            >
              <FileText size={15} color="#EF4444" style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "ALL_DUE" ? colors.primary : colors.textSecondary },
                ]}
              >
                All Pending Invoices
              </Text>
              {allDueFees.length > 0 && (
                <View style={styles.tabBadgeRed}>
                  <Text style={styles.tabBadgeRedText}>{allDueFees.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Tab 3: Payment History & Receipts */}
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "PAID" && [styles.activeTabBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.primary }],
              ]}
              onPress={() => setActiveTab("PAID")}
              activeOpacity={0.8}
            >
              <Receipt size={15} color="#10B981" style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "PAID" ? colors.primary : colors.textSecondary },
                ]}
              >
                Payment History & Receipts
              </Text>
              {paidFees.length > 0 && (
                <View style={styles.tabBadgeGreen}>
                  <Text style={styles.tabBadgeGreenText}>{paidFees.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* --- TAB 1 CONTENT: DUE THIS MONTH --- */}
        {activeTab === "DUE_MONTH" && (
          <View style={styles.tabContentSection}>
            {dueThisMonth.length > 0 ? (
              dueThisMonth.map((item: any) => (
                <View key={item.id} style={[styles.invoiceCard, { backgroundColor: colors.cardBg, borderColor: item.status === "Pending Verification" ? "#F59E0B" : "#F59E0B" }]}>
                  <View style={[styles.invoiceHeader, { backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7" }]}>
                    <View style={styles.dueBadgeContainer}>
                      {item.status === "Pending Verification" ? (
                        <>
                          <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={styles.dueBadgeText}>Under Verification</Text>
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={styles.dueBadgeText}>Due This Month</Text>
                        </>
                      )}
                    </View>
                    <Text style={[styles.lastDateText, { color: colors.textSecondary }]}>
                      Last Date: {item.last_date || item.due_date || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.invoiceBody}>
                    <Text style={[styles.invoiceTitle, { color: colors.text }]}>
                      {item.title || item.period || "Fee Invoice"}
                    </Text>
                    <Text style={[styles.invoiceRef, { color: colors.textMuted }]}>
                      Invoice Ref: <Text style={{ color: colors.text, fontWeight: "700" }}>{item.invoice_no || `INV-${item.id}`}</Text>
                    </Text>

                    <View style={[styles.payableBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Text style={[styles.payableLabel, { color: colors.textMuted }]}>Payable Amount:</Text>
                      <Text style={styles.payableAmountText}>
                        ₹{parseFloat(item.due_amount || item.fees || item.total_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.detailsBtn, { borderColor: colors.primary }]}
                        onPress={() => handleOpenDetails(item, "INVOICE")}
                        activeOpacity={0.7}
                      >
                        <Eye size={15} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.detailsBtnText, { color: colors.primary }]}>Details</Text>
                      </TouchableOpacity>

                      {item.status === "Pending Verification" ? (
                        <View style={[styles.pendingVerificationBtn, { backgroundColor: isDark ? "#451A03" : "#FEF3C7", borderColor: "#F59E0B" }]}>
                          <Clock size={14} color="#D97706" style={{ marginRight: 5 }} />
                          <Text style={[styles.pendingVerificationBtnText, { color: "#D97706" }]}>Under Verification</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.payNowBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handleOpenPayModal(item)}
                          activeOpacity={0.8}
                        >
                          <Wallet size={15} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.payNowBtnText}>Pay Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <CheckCircle2 size={42} color="#10B981" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear for This Month!</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  No monthly dues pending for the current billing period.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* --- TAB 2 CONTENT: ALL PENDING INVOICES --- */}
        {activeTab === "ALL_DUE" && (
          <View style={styles.tabContentSection}>
            {allDueFees.length > 0 ? (
              allDueFees.map((item: any) => (
                <View key={item.id} style={[styles.pendingRowCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  <View style={styles.pendingCardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingTitle, { color: colors.text }]}>
                        {item.title || item.period || "Fee Invoice"}
                      </Text>
                      <Text style={[styles.pendingRef, { color: colors.textMuted }]}>
                        {item.invoice_no || `INV-${item.id}`}
                      </Text>
                    </View>
                    {item.status === "Pending Verification" ? (
                      <View style={[styles.unpaidPill, { backgroundColor: isDark ? "#451A03" : "#FEF3C7" }]}>
                        <Clock size={11} color="#D97706" style={{ marginRight: 4 }} />
                        <Text style={[styles.unpaidPillText, { color: "#D97706" }]}>Under Verification</Text>
                      </View>
                    ) : (
                      <View style={styles.unpaidPill}>
                        <Clock size={11} color="#D97706" style={{ marginRight: 4 }} />
                        <Text style={styles.unpaidPillText}>Unpaid</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.pendingDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.pendingCardBody}>
                    <View style={styles.pendingStatCol}>
                      <Text style={[styles.pendingStatLabel, { color: colors.textMuted }]}>Due Date</Text>
                      <Text style={[styles.pendingStatVal, { color: colors.text }]}>
                        {item.due_date || item.last_date || "N/A"}
                      </Text>
                    </View>

                    <View style={styles.pendingStatCol}>
                      <Text style={[styles.pendingStatLabel, { color: colors.textMuted }]}>Balance Due</Text>
                      <Text style={styles.pendingDueVal}>
                        ₹{parseFloat(item.due_amount || item.fees || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.detailsBtn, { borderColor: colors.primary }]}
                      onPress={() => handleOpenDetails(item, "INVOICE")}
                      activeOpacity={0.7}
                    >
                      <Eye size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.detailsBtnText, { color: colors.primary }]}>View Details</Text>
                    </TouchableOpacity>

                    {item.status === "Pending Verification" ? (
                      <View style={[styles.pendingVerificationBtn, { backgroundColor: isDark ? "#451A03" : "#FEF3C7", borderColor: "#F59E0B" }]}>
                        <Clock size={14} color="#D97706" style={{ marginRight: 5 }} />
                        <Text style={[styles.pendingVerificationBtnText, { color: "#D97706" }]}>Under Verification</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.payNowBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleOpenPayModal(item)}
                        activeOpacity={0.8}
                      >
                        <CreditCard size={14} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.payNowBtnText}>Pay Fee</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <CheckCircle2 size={42} color="#10B981" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Invoices</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  All student fees and invoices are fully paid up to date!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* --- TAB 3 CONTENT: PAYMENT HISTORY & RECEIPTS --- */}
        {activeTab === "PAID" && (
          <View style={styles.tabContentSection}>
            {paidFees.length > 0 ? (
              paidFees.map((item: any) => {
                const isPending = item.status === "Pending Verification" || item.status === "pending";
                return (
                  <View key={item.id || item.receipt_no} style={[styles.pendingRowCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    <View style={styles.pendingCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pendingTitle, { color: colors.text }]}>
                          {item.period || item.title || "Fee Receipt"}
                        </Text>
                        <Text style={[styles.pendingRef, { color: colors.textMuted }]}>
                          Receipt: <Text style={{ color: colors.text, fontWeight: "700" }}>{item.receipt_no || `REC-${item.id}`}</Text>
                        </Text>
                      </View>
                      {isPending ? (
                        <View style={[styles.paidPill, { backgroundColor: isDark ? "#451A03" : "#FEF3C7" }]}>
                          <Clock size={11} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={[styles.paidPillText, { color: "#D97706" }]}>PENDING VERIFICATION</Text>
                        </View>
                      ) : (
                        <View style={styles.paidPill}>
                          <CheckCircle2 size={11} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={styles.paidPillText}>{item.status?.toUpperCase() || "SUCCESS"}</Text>
                        </View>
                      )}
                    </View>

                    <View style={[styles.pendingDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.pendingCardBody}>
                      <View style={styles.pendingStatCol}>
                        <Text style={[styles.pendingStatLabel, { color: colors.textMuted }]}>Payment Method</Text>
                        <Text style={[styles.pendingStatVal, { color: colors.text }]}>
                          {item.payment_method || "UPI / Online"}
                        </Text>
                      </View>

                      <View style={styles.pendingStatCol}>
                        <Text style={[styles.pendingStatLabel, { color: colors.textMuted }]}>Amount Paid</Text>
                        <Text style={styles.paidVal}>
                          ₹{parseFloat(item.amount_paid || item.fees_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.detailsBtn, { borderColor: colors.primary }]}
                        onPress={() => handleOpenDetails(item, "RECEIPT")}
                        activeOpacity={0.7}
                      >
                        <Eye size={14} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.detailsBtnText, { color: colors.primary }]}>View Details</Text>
                      </TouchableOpacity>

                      {isPending ? (
                        <View style={[styles.payNowBtn, { backgroundColor: isDark ? "#292524" : "#F3F4F6", borderWidth: 1, borderColor: colors.border }]}>
                          <Clock size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                          <Text style={[styles.payNowBtnText, { color: colors.textMuted }]}>Pending School</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.payNowBtn, { backgroundColor: "#059669" }]}
                          onPress={() => handleDownloadReceipt(item)}
                          activeOpacity={0.8}
                          disabled={downloadingReceiptId === (item.id || item.receipt_no)}
                        >
                          {downloadingReceiptId === (item.id || item.receipt_no) ? (
                            <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                          ) : (
                            <Download size={14} color="#FFF" style={{ marginRight: 6 }} />
                          )}
                          <Text style={styles.payNowBtnText}>
                            {downloadingReceiptId === (item.id || item.receipt_no) ? "Generating..." : "Download PDF"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                  <Receipt size={36} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payment History</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  No previous payment receipts were found for your child.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- INVOICE / RECEIPT DETAILS MODAL WITH FEE BREAKDOWN --- */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {modalType === "RECEIPT" ? "Payment Receipt Details" : "Invoice Details"}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                  {modalType === "RECEIPT"
                    ? (activeDetails?.receipt_no || `REC-${activeDetails?.id || "N/A"}`)
                    : (activeDetails?.invoice_no || `INV-${activeDetails?.id || "N/A"}`)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            {detailsLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.modalLoadingText, { color: colors.textSecondary }]}>
                  Fetching fee breakdown details...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Status & Title Card */}
                <View style={[styles.modalSummaryBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <View style={styles.modalSummaryHeader}>
                    <Text style={[styles.modalTitleText, { color: colors.text }]}>
                      {activeDetails?.title || activeDetails?.period || "Fee Details"}
                    </Text>
                    <View style={activeDetails?.status === "paid" || modalType === "RECEIPT" ? styles.paidPill : styles.unpaidPill}>
                      <Text style={activeDetails?.status === "paid" || modalType === "RECEIPT" ? styles.paidPillText : styles.unpaidPillText}>
                        {(activeDetails?.status || (modalType === "RECEIPT" ? "PAID" : "UNPAID")).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.modalMetaDate, { color: colors.textMuted }]}>
                    Issue Date: {activeDetails?.issue_date || "N/A"} • Due Date: {activeDetails?.due_date || activeDetails?.last_date || "N/A"}
                  </Text>
                </View>

                {/* FEE BREAKDOWN ITEMS TABLE (From API `items` array) */}
                {activeDetails?.items && activeDetails.items.length > 0 && (
                  <View style={styles.breakdownSection}>
                    <View style={styles.breakdownHeaderRow}>
                      <Layers size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.breakdownTitle, { color: colors.text }]}>Fee Breakdown Components</Text>
                    </View>

                    <View style={[styles.breakdownTable, { borderColor: colors.border }]}>
                      {activeDetails.items.map((feeComp: any, idx: number) => (
                        <View
                          key={feeComp.id || idx}
                          style={[
                            styles.tableRow,
                            idx < activeDetails.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.componentName, { color: colors.text }]}>
                            {feeComp.component_name || "Fee Component"}
                          </Text>
                          <Text style={[styles.componentAmount, { color: colors.text }]}>
                            ₹{parseFloat(feeComp.amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* FINANCIAL SUMMARY TABLE */}
                <View style={styles.financialSection}>
                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textMuted }]}>Subtotal</Text>
                    <Text style={[styles.modalDetailVal, { color: colors.text }]}>
                      ₹{parseFloat(activeDetails?.subtotal || activeDetails?.total_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textMuted }]}>Concession Amount</Text>
                    <Text style={[styles.modalDetailVal, { color: colors.text }]}>
                      ₹{parseFloat(activeDetails?.concession_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textMuted }]}>Late Fee Amount</Text>
                    <Text style={[styles.modalDetailVal, { color: colors.text }]}>
                      ₹{parseFloat(activeDetails?.late_fee_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textMuted }]}>Total Invoice Amount</Text>
                    <Text style={[styles.modalDetailVal, { color: colors.text, fontWeight: "900" }]}>
                      ₹{parseFloat(activeDetails?.total_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textMuted }]}>Paid Amount</Text>
                    <Text style={[styles.modalDetailVal, { color: "#059669", fontWeight: "900" }]}>
                      ₹{parseFloat(activeDetails?.paid_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.modalDetailLabel, { color: colors.textMuted }]}>Balance Due</Text>
                    <Text
                      style={[
                        styles.modalDetailVal,
                        {
                          color: parseFloat(activeDetails?.due_amount || "0") > 0 ? "#EF4444" : "#059669",
                          fontWeight: "900",
                          fontSize: 16,
                        },
                      ]}
                    >
                      ₹{parseFloat(activeDetails?.due_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>

                {/* PAYMENT RECORDS (From API `payments` array) */}
                {activeDetails?.payments && activeDetails.payments.length > 0 && (
                  <View style={styles.breakdownSection}>
                    <View style={styles.breakdownHeaderRow}>
                      <Receipt size={14} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={[styles.breakdownTitle, { color: colors.text }]}>Payment Records</Text>
                    </View>

                    {activeDetails.payments.map((pmt: any) => (
                      <View key={pmt.id} style={[styles.paymentBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                        <View style={styles.pmtHeader}>
                          <Text style={[styles.pmtReceiptNo, { color: colors.text }]}>
                            {pmt.receipt_no || `REC-${pmt.id || "N/A"}`}
                          </Text>
                          <Text style={styles.pmtAmount}>
                            ₹{parseFloat(pmt.amount_paid || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        </View>

                        <Text style={[styles.pmtMeta, { color: colors.textMuted }]}>
                          Txn: {pmt.txn_no || "N/A"} • Method: {pmt.payment_method || "Online"}
                        </Text>
                        {pmt.reference_no && (
                          <Text style={[styles.pmtMeta, { color: colors.textMuted }]}>
                            Ref / UTR: {pmt.reference_no}
                          </Text>
                        )}
                        <Text style={[styles.pmtMeta, { color: colors.textMuted }]}>
                          Date: {pmt.payment_date || "N/A"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {/* Submitted Receipt Proof if available */}
                {activeDetails?.receipt_file && (
                  <View style={styles.breakdownSection}>
                    <View style={styles.breakdownHeaderRow}>
                      <FileCheck size={14} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={[styles.breakdownTitle, { color: colors.text }]}>Submitted Payment Receipt Proof</Text>
                    </View>
                    <View style={[styles.receiptProofBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                      <Image
                        source={{ uri: getFileUrl(activeDetails.receipt_file) }}
                        style={styles.receiptProofImg}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              {modalType === "RECEIPT" || (activeDetails?.status === "paid" && parseFloat(activeDetails?.due_amount || "0") === 0) ? (
                <TouchableOpacity
                  style={[styles.modalPayBtn, { backgroundColor: "#059669" }]}
                  onPress={() => {
                    handleDownloadReceipt(activeDetails);
                  }}
                  disabled={downloadingReceiptId === (activeDetails?.id || activeDetails?.receipt_no)}
                >
                  {downloadingReceiptId === (activeDetails?.id || activeDetails?.receipt_no) ? (
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Download size={16} color="#FFF" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.modalPayBtnText}>
                    {downloadingReceiptId === (activeDetails?.id || activeDetails?.receipt_no)
                      ? "Generating Receipt PDF..."
                      : "Download Receipt PDF"}
                  </Text>
                </TouchableOpacity>
              ) : activeDetails?.status === "Pending Verification" ? (
                <View style={[styles.modalPendingBanner, { backgroundColor: isDark ? "#451A03" : "#FEF3C7", borderColor: "#F59E0B" }]}>
                  <Clock size={16} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={[styles.modalPendingText, { color: "#D97706" }]}>
                    Payment receipt submitted. Under school verification.
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.modalPayBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setDetailModalVisible(false);
                    handleOpenPayModal(activeDetails);
                  }}
                >
                  <Wallet size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalPayBtnText}>Proceed to Pay</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* --- PAYMENT & RECEIPT UPLOAD BOTTOM SHEET --- */}
      <BottomSheetModal
        ref={payBottomSheetRef}
        index={0}
        snapPoints={paySnapPoints}
        enableDynamicSizing={false}
        enableContentPanningGesture={false}
        backdropComponent={renderPayBackdrop}
        enablePanDownToClose={!submittingPayment}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        topInset={insets.top + 20}
        backgroundStyle={{
          backgroundColor: colors.cardBg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.border,
          width: 44,
          height: 4,
        }}
      >
        <View style={[styles.bottomSheetInner, { backgroundColor: colors.cardBg }]}>
          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Pay School Fees</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                {selectedPayInvoice?.invoice_no || `INV-${selectedPayInvoice?.id || "N/A"}`} • {student?.first_name || "Student"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!submittingPayment) payBottomSheetRef.current?.dismiss();
              }}
              disabled={submittingPayment}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceSubtle }]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Modal Scroll Body */}
          <BottomSheetScrollView
            style={styles.sheetScrollView}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
              {/* Invoice Summary Banner */}
              <LinearGradient
                colors={isDark ? ["#1E293B", "#0F172A"] : ["#EEF2FF", "#E0E7FF"]}
                style={styles.paySummaryBanner}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paySummaryTitle, { color: colors.text }]}>
                    {selectedPayInvoice?.title || selectedPayInvoice?.period || "School Fee Invoice"}
                  </Text>
                  <Text style={[styles.paySummarySub, { color: colors.textSecondary }]}>
                    Due Date: {selectedPayInvoice?.due_date || selectedPayInvoice?.last_date || "N/A"}
                  </Text>
                </View>
                <View style={styles.paySummaryAmountCol}>
                  <Text style={[styles.paySummaryAmountLabel, { color: colors.textSecondary }]}>Payable</Text>
                  <Text style={[styles.paySummaryAmount, { color: colors.primary }]}>
                    ₹{parseFloat(selectedPayInvoice?.due_amount || selectedPayInvoice?.total_amount || "0").toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </LinearGradient>

              {/* STEP 1: SCHOOL BANK & QR DETAILS */}
              <View style={styles.paySectionBox}>
                <View style={styles.paySectionHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.paySectionTitle, { color: colors.text }]}>
                      School Payment Information
                    </Text>
                    <Text style={[styles.paySectionSub, { color: colors.textSecondary }]}>
                      Scan QR code or pay manually using school bank details
                    </Text>
                  </View>
                </View>

                {/* Live bank details straight from school_master via API */}
                {feesData?.bank_details && (feesData.bank_details.qr_code || feesData.bank_details.account_number || feesData.bank_details.upi_id) ? (
                  <View style={{ marginTop: 12 }}>
                    {/* School QR Code Card (Always light background so QR code is clear and scannable) */}
                    {feesData.bank_details.qr_code ? (
                      <View style={styles.qrCodeCard}>
                        <Text style={styles.qrCardTitle}>Scan to Pay via UPI</Text>
                        <Text style={styles.qrCardSub}>Google Pay, PhonePe, Paytm, BHIM</Text>

                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setQrZoomVisible(true)}
                          style={styles.qrImageWrapper}
                        >
                          <Image
                            source={{ uri: getFileUrl(feesData.bank_details.qr_code) }}
                            style={styles.qrImage}
                            resizeMode="contain"
                          />
                          <View style={styles.qrZoomHint}>
                            <Maximize2 size={12} color="#4B5563" style={{ marginRight: 4 }} />
                            <Text style={styles.qrZoomText}>Tap to enlarge</Text>
                          </View>
                        </TouchableOpacity>

                        {feesData.bank_details.upi_id ? (
                          <View style={styles.upiRow}>
                            <Text style={styles.upiLabel}>UPI ID:</Text>
                            <Text style={styles.upiValue} numberOfLines={1} selectable>
                              {feesData.bank_details.upi_id}
                            </Text>
                            <TouchableOpacity
                              style={[styles.copyChipBtn, copiedField === "upi" && styles.copiedChipBtn]}
                              onPress={() => handleCopyText(feesData.bank_details.upi_id, "upi", "UPI ID")}
                              activeOpacity={0.7}
                            >
                              {copiedField === "upi" ? (
                                <>
                                  <Check size={12} color="#059669" style={{ marginRight: 4 }} />
                                  <Text style={styles.copiedChipText}>Copied</Text>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} color="#4F46E5" style={{ marginRight: 4 }} />
                                  <Text style={styles.copyChipText}>Copy</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {/* Bank Details Table Card - Separate Cards Stacked Vertically */}
                    {(feesData.bank_details.bank_name || feesData.bank_details.account_number) ? (
                      <View style={[styles.bankDetailsCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                        <View style={[styles.bankHeaderRow, { borderBottomColor: colors.border }]}>
                          <View style={[styles.bankHeaderIconWrap, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF" }]}>
                            <Building2 size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.bankCardHeading, { color: colors.text }]}>
                              {feesData.bank_details.bank_name || "School Bank Details"}
                            </Text>
                            <Text style={[styles.bankCardSub, { color: colors.textSecondary }]}>
                              Official School Beneficiary Bank Details
                            </Text>
                          </View>
                        </View>

                        {/* Separate Card for Each Bank Detail */}
                        <View style={styles.bankCardStack}>
                          {/* 1. Bank Name Card */}
                          {feesData.bank_details.bank_name ? (
                            <View style={[styles.bankDetailItemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                              <View style={styles.bankDetailItemCol}>
                                <View style={styles.bankDetailItemLabelRow}>
                                  <Building2 size={12} color={colors.primary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.bankDetailItemLabel, { color: colors.textMuted }]}>
                                    BANK NAME
                                  </Text>
                                </View>
                                <Text style={[styles.bankDetailItemValue, { color: colors.text }]}>
                                  {feesData.bank_details.bank_name}
                                </Text>
                              </View>
                            </View>
                          ) : null}

                          {/* 2. Account Holder Name Card */}
                          {feesData.bank_details.account_holder_name ? (
                            <View style={[styles.bankDetailItemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                              <View style={styles.bankDetailItemCol}>
                                <View style={styles.bankDetailItemLabelRow}>
                                  <User size={12} color={colors.primary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.bankDetailItemLabel, { color: colors.textMuted }]}>
                                    ACCOUNT HOLDER NAME
                                  </Text>
                                </View>
                                <Text style={[styles.bankDetailItemValue, { color: colors.text }]} selectable>
                                  {feesData.bank_details.account_holder_name}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.copyChipBtn, copiedField === "holder" && styles.copiedChipBtn]}
                                onPress={() => handleCopyText(feesData.bank_details.account_holder_name, "holder", "Account Holder Name")}
                                activeOpacity={0.7}
                              >
                                {copiedField === "holder" ? (
                                  <>
                                    <Check size={11} color="#059669" style={{ marginRight: 4 }} />
                                    <Text style={styles.copiedChipText}>Copied</Text>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} color="#4F46E5" style={{ marginRight: 4 }} />
                                    <Text style={styles.copyChipText}>Copy</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          ) : null}

                          {/* 3. Account Number Card (Highlighted) */}
                          {feesData.bank_details.account_number ? (
                            <View
                              style={[
                                styles.bankDetailItemCard,
                                styles.bankDetailAccCard,
                                {
                                  backgroundColor: isDark ? "rgba(99, 102, 241, 0.12)" : "#F0F4FF",
                                  borderColor: isDark ? "rgba(99, 102, 241, 0.4)" : "#C7D2FE",
                                },
                              ]}
                            >
                              <View style={styles.bankDetailItemCol}>
                                <View style={styles.bankDetailItemLabelRow}>
                                  <CreditCard size={12} color={colors.primary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.bankDetailItemLabel, { color: colors.primary, fontWeight: "800" }]}>
                                    ACCOUNT NUMBER
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.bankDetailAccValue,
                                    { color: isDark ? "#A5B4FC" : "#312E81" },
                                  ]}
                                  selectable
                                >
                                  {feesData.bank_details.account_number}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.copyChipBtn, copiedField === "acc" && styles.copiedChipBtn]}
                                onPress={() => handleCopyText(feesData.bank_details.account_number, "acc", "Account Number")}
                                activeOpacity={0.7}
                              >
                                {copiedField === "acc" ? (
                                  <>
                                    <Check size={11} color="#059669" style={{ marginRight: 4 }} />
                                    <Text style={styles.copiedChipText}>Copied</Text>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} color="#4F46E5" style={{ marginRight: 4 }} />
                                    <Text style={styles.copyChipText}>Copy</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          ) : null}

                          {/* 4. IFSC Code Card */}
                          {feesData.bank_details.ifsc_code ? (
                            <View style={[styles.bankDetailItemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                              <View style={styles.bankDetailItemCol}>
                                <View style={styles.bankDetailItemLabelRow}>
                                  <IdCard size={12} color={colors.primary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.bankDetailItemLabel, { color: colors.textMuted }]}>
                                    IFSC CODE
                                  </Text>
                                </View>
                                <Text style={[styles.bankDetailIfscValue, { color: colors.text }]} selectable>
                                  {feesData.bank_details.ifsc_code}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.copyChipBtn, copiedField === "ifsc" && styles.copiedChipBtn]}
                                onPress={() => handleCopyText(feesData.bank_details.ifsc_code, "ifsc", "IFSC Code")}
                                activeOpacity={0.7}
                              >
                                {copiedField === "ifsc" ? (
                                  <>
                                    <Check size={11} color="#059669" style={{ marginRight: 4 }} />
                                    <Text style={styles.copiedChipText}>Copied</Text>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} color="#4F46E5" style={{ marginRight: 4 }} />
                                    <Text style={styles.copyChipText}>Copy</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          ) : null}

                          {/* 5. Branch Name Card */}
                          {feesData.bank_details.branch_name ? (
                            <View style={[styles.bankDetailItemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                              <View style={styles.bankDetailItemCol}>
                                <View style={styles.bankDetailItemLabelRow}>
                                  <Building2 size={12} color={colors.textSecondary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.bankDetailItemLabel, { color: colors.textMuted }]}>
                                    BRANCH NAME
                                  </Text>
                                </View>
                                <Text style={[styles.bankDetailItemValue, { color: colors.text }]}>
                                  {feesData.bank_details.branch_name}
                                </Text>
                              </View>
                            </View>
                          ) : null}

                          {/* 6. UPI ID Card */}
                          {feesData.bank_details.upi_id ? (
                            <View style={[styles.bankDetailItemCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                              <View style={styles.bankDetailItemCol}>
                                <View style={styles.bankDetailItemLabelRow}>
                                  <QrCode size={12} color={colors.primary} style={{ marginRight: 6 }} />
                                  <Text style={[styles.bankDetailItemLabel, { color: colors.textMuted }]}>
                                    UPI ID
                                  </Text>
                                </View>
                                <Text style={[styles.bankDetailUpiValue, { color: colors.text }]} selectable>
                                  {feesData.bank_details.upi_id}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.copyChipBtn, copiedField === "upi_bank" && styles.copiedChipBtn]}
                                onPress={() => handleCopyText(feesData.bank_details.upi_id, "upi_bank", "UPI ID")}
                                activeOpacity={0.7}
                              >
                                {copiedField === "upi_bank" ? (
                                  <>
                                    <Check size={11} color="#059669" style={{ marginRight: 4 }} />
                                    <Text style={styles.copiedChipText}>Copied</Text>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={11} color="#4F46E5" style={{ marginRight: 4 }} />
                                    <Text style={styles.copyChipText}>Copy</Text>
                                  </>
                                )}
                              </TouchableOpacity>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <View style={[styles.noBankNotice, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <AlertCircle size={20} color="#D97706" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.noBankTitle, { color: colors.text }]}>No Bank Details Configured</Text>
                      <Text style={[styles.noBankSub, { color: colors.textSecondary }]}>
                        The school has not updated their bank/QR information yet. Please contact the school office to complete payment.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* STEP 2: PAYMENT VERIFICATION SUBMISSION */}
              <View style={[styles.paySectionBox, { marginTop: 14 }]}>
                <View style={styles.paySectionHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: "#059669" }]}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.paySectionTitle, { color: colors.text }]}>
                      Submit Payment Proof
                    </Text>
                    <Text style={[styles.paySectionSub, { color: colors.textSecondary }]}>
                      Upload payment screenshot / receipt for verification
                    </Text>
                  </View>
                </View>

                {/* Payment Method Selector */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 14 }]}>
                  Payment Mode Used <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                <View style={styles.methodChipsRow}>
                  {["UPI / QR Code", "Bank Transfer (NEFT/IMPS)", "Cheque / DD", "Cash", "Other"].map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <TouchableOpacity
                        key={method}
                        onPress={() => setPaymentMethod(method)}
                        style={[
                          styles.methodChip,
                          { borderColor: isSelected ? colors.primary : colors.border },
                          isSelected && { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF" },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.methodChipText,
                            { color: isSelected ? colors.primary : colors.textSecondary },
                            isSelected && { fontWeight: "700" },
                          ]}
                        >
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Reference No / UTR Input */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 14 }]}>
                  Transaction Ref / UTR / Cheque Number
                </Text>
                <BottomSheetTextInput
                  style={[styles.formInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 240987654321 or Cheque # 1002"
                  placeholderTextColor={colors.textMuted}
                  value={referenceNo}
                  onChangeText={setReferenceNo}
                  autoCapitalize="characters"
                />

                {/* Payment Receipt Upload */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 14 }]}>
                  Payment Receipt Screenshot / Photo <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>

                {receiptAsset ? (
                  <View style={[styles.receiptPreviewBox, { backgroundColor: colors.surfaceSubtle, borderColor: "#059669" }]}>
                    <Image
                      source={{ uri: receiptAsset.uri }}
                      style={styles.receiptThumb}
                      resizeMode="cover"
                    />
                    <View style={styles.receiptMetaCol}>
                      <View style={styles.receiptSuccessRow}>
                        <CheckCircle2 size={14} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.receiptSuccessText}>Receipt Attached</Text>
                      </View>
                      <Text style={[styles.receiptFileName, { color: colors.text }]} numberOfLines={1}>
                        {receiptAsset.fileName || "receipt_screenshot.jpg"}
                      </Text>
                      <View style={styles.receiptActionsRow}>
                        <TouchableOpacity
                          style={[styles.receiptActionBtn, { borderColor: colors.border }]}
                          onPress={handlePickReceipt}
                        >
                          <Text style={[styles.receiptActionBtnText, { color: colors.primary }]}>Change</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.receiptActionBtn, { borderColor: "#FCA5A5", marginLeft: 8 }]}
                          onPress={() => setReceiptAsset(null)}
                        >
                          <Trash2 size={12} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={[styles.receiptActionBtnText, { color: "#EF4444" }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.receiptUploadContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <View style={[styles.uploadIconWrap, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF" }]}>
                      <UploadCloud size={24} color={colors.primary} />
                    </View>
                    <Text style={[styles.uploadPromptTitle, { color: colors.text }]}>
                      Upload Payment Receipt
                    </Text>
                    <Text style={[styles.uploadPromptSub, { color: colors.textSecondary }]}>
                      Attach screenshot or photo of transaction confirmation
                    </Text>

                    <View style={styles.uploadButtonsRow}>
                      <TouchableOpacity
                        style={[
                          styles.uploadActionBtn,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: isDark ? "rgba(99, 102, 241, 0.35)" : "#C7D2FE",
                          },
                        ]}
                        onPress={handlePickReceipt}
                        activeOpacity={0.72}
                      >
                        <View style={[styles.uploadBtnIconBadge, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.18)" : "#EEF2FF" }]}>
                          <ImageIcon size={20} color={colors.primary} strokeWidth={2.2} />
                        </View>
                        <View style={styles.uploadBtnTextWrap}>
                          <Text
                            style={[styles.uploadBtnTitle, { color: colors.text }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            Choose from Gallery
                          </Text>
                          <Text style={[styles.uploadBtnSub, { color: colors.textSecondary }]}>
                            Upload image
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.uploadActionBtn,
                          {
                            backgroundColor: colors.cardBg,
                            borderColor: isDark ? "rgba(99, 102, 241, 0.35)" : "#C7D2FE",
                          },
                        ]}
                        onPress={handleTakeReceiptPhoto}
                        activeOpacity={0.72}
                      >
                        <View style={[styles.uploadBtnIconBadge, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.18)" : "#EEF2FF" }]}>
                          <Camera size={20} color={colors.primary} strokeWidth={2.2} />
                        </View>
                        <View style={styles.uploadBtnTextWrap}>
                          <Text
                            style={[styles.uploadBtnTitle, { color: colors.text }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            Take Photo
                          </Text>
                          <Text style={[styles.uploadBtnSub, { color: colors.textSecondary }]}>
                            Open camera
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Additional Notes */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 14 }]}>
                  Remarks / Notes (Optional)
                </Text>
                <BottomSheetTextInput
                  style={[styles.formInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text, minHeight: 40 }]}
                  placeholder="e.g. Paid via GPay from father's account"
                  placeholderTextColor={colors.textMuted}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                />
              </View>
            </BottomSheetScrollView>

            {/* BottomSheet Footer */}
            <View style={[styles.sheetFooter, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[
                  styles.submitPaymentBtn,
                  { backgroundColor: !receiptAsset || submittingPayment ? (isDark ? "#374151" : "#D1D5DB") : colors.primary },
                ]}
                onPress={handleSubmitPaymentVerification}
                disabled={!receiptAsset || submittingPayment}
                activeOpacity={0.85}
              >
                {submittingPayment ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitPaymentBtnText}>Uploading & Submitting...</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitPaymentBtnText}>Submit Payment for Verification</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetModal>

      {/* --- QR CODE FULLSCREEN ZOOM MODAL --- */}
      <Modal
        visible={qrZoomVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrZoomVisible(false)}
      >
        <View style={styles.zoomOverlay}>
          <View style={styles.zoomCard}>
            <View style={styles.zoomHeader}>
              <Text style={styles.zoomTitle}>School Payment QR Code</Text>
              <TouchableOpacity onPress={() => setQrZoomVisible(false)} style={styles.zoomCloseBtn}>
                <X size={20} color="#374151" />
              </TouchableOpacity>
            </View>

            {feesData?.bank_details?.qr_code && (
              <Image
                source={{ uri: getFileUrl(feesData.bank_details.qr_code) }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            )}

            {feesData?.bank_details?.upi_id && (
              <View style={styles.zoomUpiBox}>
                <Text style={styles.zoomUpiLabel} numberOfLines={1}>UPI ID: {feesData.bank_details.upi_id}</Text>
                <TouchableOpacity
                  style={styles.zoomCopyBtn}
                  onPress={() => handleCopyText(feesData.bank_details.upi_id, "zoom_upi", "UPI ID")}
                >
                  <Copy size={13} color="#4F46E5" style={{ marginRight: 4 }} />
                  <Text style={styles.zoomCopyText}>Copy</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.zoomFooterNotice}>
              Scan from any UPI application on your mobile device to complete payment.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* Banner Card */
  profileBannerCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarBorder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    marginRight: 14,
  },
  bannerAvatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
  },
  bannerInfo: {
    flex: 1,
  },
  admBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(59, 130, 246, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  admBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  bannerStudentName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 4,
  },
  subMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subMetaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  subMetaLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  subMetaVal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
  },

  /* Metrics Grid */
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  metricCardHalf: {
    width: (width - 44) / 2,
    borderRadius: 18,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    justifyContent: "space-between",
    minHeight: 110,
  },
  metricCardFull: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
    position: "relative",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 90,
  },
  metricContent: {
    flex: 1,
    zIndex: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.85)",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 2,
  },
  metricAmountGrid: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 2,
  },
  metricSubtext: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
    fontWeight: "500",
  },
  hologramContainer: {
    position: "absolute",
    right: -12,
    bottom: -15,
    zIndex: 1,
  },

  /* Tab Bar */
  tabBarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabScroll: {
    flexDirection: "row",
    gap: 6,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  activeTabBtn: {
    borderRadius: 12,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  tabBadgeAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeAmberText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "900",
  },
  tabBadgeRed: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeRedText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "900",
  },
  tabBadgeGreen: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeGreenText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "900",
  },

  /* Content Section */
  tabContentSection: {
    gap: 14,
  },
  invoiceCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dueBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  lastDateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  invoiceBody: {
    padding: 16,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  invoiceRef: {
    fontSize: 12,
    marginBottom: 14,
  },
  payableBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  payableLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  payableAmountText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#EF4444",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  payNowBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
  },
  payNowBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },

  /* Pending All Card */
  pendingRowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  pendingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  pendingRef: {
    fontSize: 12,
  },
  unpaidPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unpaidPillText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "800",
  },
  paidPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidPillText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
  },
  pendingDivider: {
    height: 1,
    marginVertical: 12,
  },
  pendingCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  pendingStatCol: {
    gap: 2,
  },
  pendingStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pendingStatVal: {
    fontSize: 13,
    fontWeight: "700",
  },
  pendingDueVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#EF4444",
  },
  paidVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#059669",
  },

  /* Empty Cards */
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalSummaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  modalSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitleText: {
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  modalMetaDate: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* Fee Breakdown Table */
  breakdownSection: {
    marginBottom: 14,
  },
  breakdownHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  breakdownTable: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  componentName: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  componentAmount: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* Financial Summary */
  financialSection: {
    marginBottom: 14,
  },
  modalDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(150,150,150,0.15)",
  },
  modalDetailLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalDetailVal: {
    fontSize: 13,
    fontWeight: "800",
  },

  /* Payment Records */
  paymentBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  pmtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  pmtReceiptNo: {
    fontSize: 13,
    fontWeight: "800",
  },
  pmtAmount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#059669",
  },
  pmtMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  modalFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  modalPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalPayBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Pending Verification Badges & Buttons */
  pendingVerificationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingVerificationBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  modalPendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  modalPendingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  receiptProofBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  receiptProofImg: {
    width: "100%",
    height: 180,
    borderRadius: 8,
  },

  /* Pay & Receipt Upload BottomSheet */
  bottomSheetInner: {
    flex: 1,
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  payModalCard: {
    width: "94%",
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  paySummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  paySummaryTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  paySummarySub: {
    fontSize: 12,
    marginTop: 2,
  },
  paySummaryAmountCol: {
    alignItems: "flex-end",
  },
  paySummaryAmountLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  paySummaryAmount: {
    fontSize: 18,
    fontWeight: "900",
  },
  paySectionBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(150,150,150,0.15)",
    padding: 14,
  },
  paySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  paySectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  paySectionSub: {
    fontSize: 11,
    marginTop: 1,
  },

  /* QR Code Card */
  qrCodeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  qrCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  qrCardSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
    marginBottom: 10,
  },
  qrImageWrapper: {
    alignItems: "center",
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrImage: {
    width: 170,
    height: 170,
  },
  qrZoomHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  qrZoomText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 12,
    width: "100%",
  },
  upiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
    marginRight: 6,
  },
  upiValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  copyChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  copiedChipBtn: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  copyChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  copiedChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },

  /* Bank Details Card - 2-Column Side-by-Side Layout */
  bankDetailsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  bankHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  bankHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bankCardHeading: {
    fontSize: 13,
    fontWeight: "800",
  },
  bankCardSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  bankCardStack: {
    gap: 9,
  },
  bankDetailItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bankDetailAccCard: {
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  bankDetailItemCol: {
    flex: 1,
    marginRight: 10,
  },
  bankDetailItemLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bankDetailItemLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  bankDetailItemValue: {
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
  },
  bankDetailAccValue: {
    fontSize: 15.5,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  bankDetailIfscValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  bankDetailUpiValue: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* No Bank Notice */
  noBankNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  noBankTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  noBankSub: {
    fontSize: 11,
    marginTop: 2,
  },

  /* Form Elements */
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  methodChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 6,
  },

  /* Receipt Upload Box */
  receiptUploadContainer: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadPromptTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  uploadPromptSub: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
    marginBottom: 14,
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "space-between",
  },
  uploadActionBtn: {
    flex: 1,
    height: 96,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  uploadBtnIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  uploadBtnTextWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  uploadBtnTitle: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  uploadBtnSub: {
    fontSize: 10.5,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 1,
    lineHeight: 13,
  },
  receiptPreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  receiptThumb: {
    width: 65,
    height: 65,
    borderRadius: 8,
  },
  receiptMetaCol: {
    flex: 1,
    marginLeft: 12,
  },
  receiptSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  receiptSuccessText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  receiptFileName: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 6,
  },
  receiptActionsRow: {
    flexDirection: "row",
  },
  receiptActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  receiptActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  submitPaymentBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    width: "100%",
  },
  submitPaymentBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* Zoom Modal */
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  zoomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 380,
    alignItems: "center",
  },
  zoomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  zoomTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  zoomCloseBtn: {
    padding: 4,
  },
  zoomImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
  },
  zoomUpiBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
    width: "100%",
  },
  zoomUpiLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  zoomCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoomCopyText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  zoomFooterNotice: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
  },
});