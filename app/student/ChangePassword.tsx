import SubHeader from "@/components/dashboard/SubHeader";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import Toast from "react-native-toast-message";
import { cleanErrorMessage } from "@/utils/api";
import { apiFetch } from "@/services/apiClient";
import { useAppTheme } from "@/theme";

const ChangePassword = () => {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP Verification State
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<TextInput>(null);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill all fields",
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "New password must be at least 6 characters long",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Passwords do not match",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/parent/auth/profile/request-otp", {
        method: "POST",
        body: JSON.stringify({
          action: "change_password",
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
        }),
      });

      if (!response.success) {
        throw new Error(cleanErrorMessage(response.message, "Failed to send verification OTP."));
      }

      const masked = response.data?.maskedEmail || "your registered email";
      setMaskedEmail(masked);
      setOtpCode("");
      setOtpStep(true);
      setResendCooldown(30);

      Toast.show({
        type: "success",
        text1: "OTP Sent",
        text2: response.message || `A 6-digit verification code has been sent to ${masked}.`,
      });

      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 250);
    } catch (err: any) {
      const msg = cleanErrorMessage(
        err?.message,
        "Failed to send verification OTP. Please check your current password."
      );
      Toast.show({
        type: "error",
        text1: "Request Failed",
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    const cleanOtp = otpCode.trim();
    if (cleanOtp.length !== 6) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter the complete 6-digit verification code.",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch("/parent/auth/profile", {
        method: "PUT",
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
          otp: cleanOtp,
        }),
      });

      if (!response.success) {
        throw new Error(cleanErrorMessage(response.message, "Invalid or expired OTP."));
      }

      Toast.show({
        type: "success",
        text1: "Password Updated",
        text2: response.message || "Your password has been changed successfully.",
      });
      router.back();
    } catch (err: any) {
      const msg = cleanErrorMessage(err?.message, "Failed to update password.");
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const digits = otpCode.split("");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Change Password" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!otpStep ? (
            <>
              <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Current Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.currentPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, currentPassword: text })
                    }
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} color={colors.textMuted} />
                    ) : (
                      <Eye size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  New Password{" "}
                  <Text style={{ fontWeight: "400", fontSize: 12, color: colors.textMuted }}>
                    (min. 6 characters)
                  </Text>
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.newPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, newPassword: text })
                    }
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showNewPassword ? (
                      <EyeOff size={20} color={colors.textMuted} />
                    ) : (
                      <Eye size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm New Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={formData.confirmPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, confirmPassword: text })
                    }
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={colors.textMuted} />
                    ) : (
                      <Eye size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                onPress={handleRequestOtp}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.otpTitle, { color: colors.text }]}>
                Verify 6-Digit Email OTP
              </Text>
              <Text style={[styles.otpSubtitle, { color: colors.textSecondary }]}>
                Enter the 6-digit verification code sent to{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>{maskedEmail}</Text>.
              </Text>

              <TouchableOpacity
                style={styles.otpContainer}
                activeOpacity={1}
                onPress={() => otpInputRef.current?.focus()}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const digit = digits[index] || "";
                  const isCurrent =
                    otpCode.length === index || (otpCode.length === 6 && index === 5);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.digitBox,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: isCurrent || digit ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.digitText,
                          { color: digit ? colors.text : colors.textMuted },
                        ]}
                      >
                        {digit || "•"}
                      </Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={otpInputRef}
                  style={styles.hiddenOtpInput}
                  value={otpCode}
                  onChangeText={(text) =>
                    setOtpCode(text.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </TouchableOpacity>

              <View style={styles.otpActionsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setOtpStep(false);
                    setOtpCode("");
                  }}
                  disabled={loading}
                >
                  <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={resendCooldown > 0 || loading}
                >
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: resendCooldown > 0 ? colors.textMuted : colors.primary,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  (loading || otpCode.length !== 6) && { opacity: 0.6 },
                ]}
                onPress={handleConfirmUpdate}
                activeOpacity={0.8}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Confirm & Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  headerInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 10,
  },
  formCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  eyeIcon: {
    padding: 6,
  },
  saveButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  otpSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 18,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
    position: "relative",
  },
  digitBox: {
    flex: 1,
    height: 52,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  digitText: {
    fontSize: 20,
    fontWeight: "700",
  },
  hiddenOtpInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  otpActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

export default ChangePassword;
