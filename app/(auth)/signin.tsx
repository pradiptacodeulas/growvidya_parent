import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDispatch, useSelector } from "react-redux";
import { login, loginWithPasscode } from "@/redux/auth/authThunk";
import { AppDispatch, RootState } from "@/redux/store";
import Toast from "react-native-toast-message";
import { useAppTheme } from "@/theme";
import { cleanErrorMessage } from "@/utils/api";
import { apiFetch } from "@/services/apiClient";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();
  const { loading } = useSelector((state: RootState) => state.auth);

  // Authentication Mode: 'passcode' (Email OTP) or 'password'
  const [authMethod, setAuthMethod] = useState<"passcode" | "password">("passcode");

  // Passcode flow step: 1 (Enter Email) or 2 (Enter 6-Digit OTP)
  const [step, setStep] = useState<1 | 2>(1);

  // Common identifier: Parent Registered Email Address
  const [identifier, setIdentifier] = useState("");

  // Password-based authentication states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Passcode-based authentication states
  const [passcode, setPasscode] = useState("");
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [requestingPasscode, setRequestingPasscode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot Password 3-step flow states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");

  const passcodeInputRef = useRef<TextInput>(null);
  const forgotOtpInputRef = useRef<TextInput>(null);

  const logoSource = isDark
    ? require("@/assets/images/logo_dark.png")
    : require("@/assets/images/logo.png");

  // Clear any legacy saved identifier on mount so email is never left behind after logout
  useEffect(() => {
    AsyncStorage.multiRemove(["@parent_saved_identifier", "@parent_remember_me"]).catch(() => {});
  }, []);

  // Countdown timer for sign-in OTP resend cooldown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Countdown timer for forgot-password OTP resend cooldown
  useEffect(() => {
    let timer: any;
    if (forgotCooldown > 0) {
      timer = setTimeout(() => setForgotCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [forgotCooldown]);

  // Request 6-digit Email OTP for Sign-In
  const handleRequestPasscode = async () => {
    setErrorMessage("");
    const cleanEmail = identifier.trim();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      const msg = "Please enter a valid registered email address.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setRequestingPasscode(true);
    try {
      const response = await apiFetch("/parent/auth/request-passcode", {
        method: "POST",
        body: JSON.stringify({ identifier: cleanEmail, email: cleanEmail }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to send OTP.");
      }

      const resData = response.data || {};
      const masked = resData.maskedEmail || resData.maskedIdentifier || cleanEmail;
      setMaskedIdentifier(masked);
      setPasscode("");
      setStep(2);
      setResendCooldown(30);

      Toast.show({
        type: "success",
        text1: "6-Digit OTP Sent! ✉️",
        text2: response.message || `A 6-digit OTP has been sent to ${masked}.`,
      });

      setTimeout(() => {
        passcodeInputRef.current?.focus();
      }, 300);
    } catch (err: any) {
      const msg = cleanErrorMessage(
        err?.message,
        "Failed to send OTP. Please check your email address."
      );
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Request Failed", text2: msg });
    } finally {
      setRequestingPasscode(false);
    }
  };

  // Verify 6-digit Email OTP & sign in
  const handleVerifyPasscode = async () => {
    setErrorMessage("");
    const cleanCode = passcode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      const msg = "Please enter the full 6-digit OTP.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    const cleanEmail = identifier.trim();
    try {
      const resultAction = await dispatch(
        loginWithPasscode({
          identifier: cleanEmail,
          passcode: cleanCode,
        })
      );

      if (loginWithPasscode.rejected.match(resultAction)) {
        const msg = cleanErrorMessage(
          resultAction.payload as string,
          "Invalid or expired 6-digit OTP. Please try again."
        );
        setErrorMessage(msg);
        Toast.show({ type: "error", text1: "Verification Failed", text2: msg });
      } else {
        setIdentifier("");
        setPasscode("");
        setPassword("");
        setStep(1);
        Toast.show({
          type: "success",
          text1: "Welcome Back! 👋",
          text2: "Signed in successfully!",
        });
      }
    } catch (error: any) {
      const msg = cleanErrorMessage(
        error?.message,
        "Unable to verify OTP. Please check connection."
      );
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Verification Failed", text2: msg });
    }
  };

  // Password-based login
  const handlePasswordLogin = async () => {
    setErrorMessage("");
    const cleanEmail = identifier.trim();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      const msg = "Please enter a valid registered email address.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }
    if (!password.trim()) {
      const msg = "Please enter your password.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    try {
      const resultAction = await dispatch(
        login({
          identifier: cleanEmail,
          email: cleanEmail,
          password: password.trim(),
        })
      );
      if (login.rejected.match(resultAction)) {
        const msg = cleanErrorMessage(
          resultAction.payload as string,
          "Invalid email or password. Please check your credentials."
        );
        setErrorMessage(msg);
        Toast.show({ type: "error", text1: "Login Failed", text2: msg });
      } else {
        setIdentifier("");
        setPassword("");
        setPasscode("");
        Toast.show({
          type: "success",
          text1: "Welcome Back! 👋",
          text2: "Signed in successfully.",
        });
      }
    } catch (error: any) {
      const msg = cleanErrorMessage(
        error?.message,
        "Unable to sign in. Please check your connection."
      );
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Login Failed", text2: msg });
    }
  };

  // ===================================================
  // 3-STEP FORGOT PASSWORD HANDLERS
  // ===================================================
  const handleStartForgotPassword = () => {
    setForgotMode(true);
    setForgotStep(1);
    setForgotOtp("");
    setForgotResetToken("");
    setNewPassword("");
    setConfirmNewPassword("");
    setErrorMessage("");
  };

  const handleRequestForgotOtp = async () => {
    setErrorMessage("");
    const cleanEmail = identifier.trim();
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      const msg = "Please enter your registered email address.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setForgotLoading(true);
    try {
      const response = await apiFetch("/parent/auth/forgot-password/request-otp", {
        method: "POST",
        body: JSON.stringify({ email: cleanEmail, identifier: cleanEmail }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to send password reset OTP.");
      }

      const resData = response.data || {};
      const masked = resData.maskedEmail || resData.maskedIdentifier || cleanEmail;
      setForgotMaskedEmail(masked);
      setForgotOtp("");
      setForgotStep(2);
      setForgotCooldown(30);

      Toast.show({
        type: "success",
        text1: "Reset OTP Sent! ✉️",
        text2: response.message || `A 6-digit OTP has been sent to ${masked}.`,
      });

      setTimeout(() => {
        forgotOtpInputRef.current?.focus();
      }, 300);
    } catch (err: any) {
      const msg = cleanErrorMessage(
        err?.message,
        "Failed to send password reset OTP."
      );
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Request Failed", text2: msg });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyForgotOtp = async () => {
    setErrorMessage("");
    const cleanCode = forgotOtp.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      const msg = "Please enter the complete 6-digit OTP.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    const cleanEmail = identifier.trim();
    setForgotLoading(true);
    try {
      const response = await apiFetch("/parent/auth/forgot-password/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: cleanEmail,
          identifier: cleanEmail,
          otp: cleanCode,
        }),
      });

      if (!response.success || !response.data?.resetToken) {
        throw new Error(response.message || "Invalid or expired OTP.");
      }

      setForgotResetToken(response.data.resetToken);
      setForgotStep(3);
      Toast.show({
        type: "success",
        text1: "OTP Verified",
        text2: "Please enter your new password.",
      });
    } catch (err: any) {
      const msg = cleanErrorMessage(err?.message, "Invalid or expired OTP.");
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Verification Failed", text2: msg });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    setErrorMessage("");
    if (!newPassword || newPassword.length < 6) {
      const msg = "New password must be at least 6 characters long.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      const msg = "New password and confirm password do not match.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setForgotLoading(true);
    try {
      const response = await apiFetch("/parent/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({
          resetToken: forgotResetToken,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to reset password.");
      }

      Toast.show({
        type: "success",
        text1: "Password Reset Successful",
        text2: response.message || "You can now sign in with your new password.",
      });

      setForgotMode(false);
      setForgotStep(1);
      setForgotOtp("");
      setForgotResetToken("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPassword("");
      setAuthMethod("password");
    } catch (err: any) {
      const msg = cleanErrorMessage(err?.message, "Failed to reset password.");
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Reset Failed", text2: msg });
    } finally {
      setForgotLoading(false);
    }
  };

  // 6-digit interactive OTP boxes
  const renderOtpBoxes = (
    value: string,
    onChange: (val: string) => void,
    inputRef: React.RefObject<TextInput | null>,
    autoFocusNow: boolean
  ) => {
    const digits = value.split("");
    return (
      <TouchableOpacity
        style={styles.passcodeContainer}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const digit = digits[index] || "";
          const isCurrent =
            value.length === index || (value.length === 6 && index === 5);
          return (
            <View
              key={index}
              style={[
                styles.digitBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: isCurrent
                    ? colors.primary
                    : digit
                    ? colors.primary
                    : colors.border,
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
          ref={inputRef}
          style={styles.hiddenPasscodeInput}
          value={value}
          onChangeText={(text) =>
            onChange(text.replace(/[^0-9]/g, "").slice(0, 6))
          }
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={autoFocusNow}
        />
      </TouchableOpacity>
    );
  };

  const isOtpInputView =
    (!forgotMode && authMethod === "passcode" && step === 2) ||
    (forgotMode && forgotStep === 2);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            bounces={false}
            overScrollMode="never"
          >
            <View style={styles.mainContent}>
              {/* Logo Section (Hidden on OTP input screen) */}
              {!isOtpInputView && (
                <View style={styles.logoContainer}>
                  <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
                </View>
              )}

              {/* Header Text Section */}
              <View style={styles.headerTextSection}>
                {!isOtpInputView && (
                  <View style={[styles.portalBadge, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="people" size={14} color={colors.primary} />
                    <Text style={[styles.portalBadgeText, { color: colors.primary }]}>
                      PARENT PORTAL
                    </Text>
                  </View>
                )}
                <Text style={[styles.titleText, { color: colors.text }]}>
                  {forgotMode
                    ? forgotStep === 1
                      ? "Forgot Password"
                      : forgotStep === 2
                      ? "Enter 6-Digit OTP"
                      : "Set New Password"
                    : authMethod === "passcode" && step === 2
                    ? "Enter 6-Digit OTP"
                    : "Parent Sign In"}
                </Text>
                <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                  {forgotMode
                    ? forgotStep === 1
                      ? "Enter your registered email address to receive a 6-digit password reset OTP"
                      : forgotStep === 2
                      ? `We sent a 6-digit verification code to ${forgotMaskedEmail || identifier}`
                      : "Create a strong new password for your parent account"
                    : authMethod === "passcode"
                    ? step === 1
                      ? "Enter your registered email address to receive a 6-digit OTP"
                      : `We sent a 6-digit verification code to ${maskedIdentifier || identifier}`
                    : "Sign in with your registered email address and password"}
                </Text>
              </View>

              {/* Authentication Method Segmented Tabs (Only on main Step 1 / Password view) */}
              {!forgotMode && !isOtpInputView && (
                <View
                  style={[
                    styles.authMethodTabs,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.authMethodTab,
                      authMethod === "passcode" && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      setAuthMethod("passcode");
                      setStep(1);
                      setPasscode("");
                      setErrorMessage("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="key-outline"
                      size={16}
                      color={authMethod === "passcode" ? "#FFFFFF" : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.authMethodTabText,
                        { color: authMethod === "passcode" ? "#FFFFFF" : colors.textMuted },
                      ]}
                    >
                      6-Digit OTP
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.authMethodTab,
                      authMethod === "password" && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      setAuthMethod("password");
                      setStep(1);
                      setErrorMessage("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color={authMethod === "password" ? "#FFFFFF" : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.authMethodTabText,
                        { color: authMethod === "password" ? "#FFFFFF" : colors.textMuted },
                      ]}
                    >
                      Password
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error Banner */}
              {!!errorMessage && (
                <View style={[styles.errorBox, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
                  <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                  <Text style={[styles.errorText, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
                    {errorMessage}
                  </Text>
                </View>
              )}

              {/* =================================================== */}
              {/* FORGOT PASSWORD 3-STEP FLOW                         */}
              {/* =================================================== */}
              {forgotMode ? (
                <View style={styles.formGroup}>
                  {forgotStep === 1 && (
                    <>
                      <Text style={[styles.formLabel, { color: colors.text }]}>
                        Registered Email Address
                      </Text>
                      <View
                        style={[
                          styles.inputIconWrapper,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={20}
                          color={colors.textMuted}
                          style={styles.inputAddonIcon}
                        />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          placeholder="Enter your registered email address"
                          placeholderTextColor={colors.textMuted}
                          value={identifier}
                          onChangeText={setIdentifier}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="done"
                          onSubmitEditing={handleRequestForgotOtp}
                        />
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.loginButton,
                          { backgroundColor: colors.primary },
                          forgotLoading && styles.disabledBtn,
                        ]}
                        onPress={handleRequestForgotOtp}
                        disabled={forgotLoading}
                        activeOpacity={0.8}
                      >
                        {forgotLoading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <View style={styles.btnRow}>
                            <Ionicons name="mail" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.loginButtonText}>Send Reset OTP</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {forgotStep === 2 && (
                    <>
                      {renderOtpBoxes(forgotOtp, setForgotOtp, forgotOtpInputRef, true)}

                      <View style={styles.passcodeActionsRow}>
                        <TouchableOpacity
                          onPress={() => {
                            setForgotStep(1);
                            setForgotOtp("");
                            setErrorMessage("");
                          }}
                          activeOpacity={0.7}
                          style={styles.actionLinkBtn}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={14}
                            color={colors.textMuted}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.actionLinkText, { color: colors.textMuted }]}>
                            Change Email
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={forgotCooldown > 0 || forgotLoading}
                          onPress={handleRequestForgotOtp}
                          activeOpacity={0.7}
                          style={styles.actionLinkBtn}
                        >
                          <Ionicons
                            name="refresh-outline"
                            size={14}
                            color={forgotCooldown > 0 ? colors.textMuted : colors.primary}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.actionLinkText,
                              {
                                color: forgotCooldown > 0 ? colors.textMuted : colors.primary,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : "Resend OTP"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.loginButton,
                          { backgroundColor: colors.primary },
                          (forgotLoading || forgotOtp.length !== 6) && styles.disabledBtn,
                        ]}
                        onPress={handleVerifyForgotOtp}
                        disabled={forgotLoading || forgotOtp.length !== 6}
                        activeOpacity={0.8}
                      >
                        {forgotLoading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <View style={styles.btnRow}>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.loginButtonText}>Verify OTP</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {forgotStep === 3 && (
                    <>
                      <Text style={[styles.formLabel, { color: colors.text }]}>
                        New Password
                      </Text>
                      <View
                        style={[
                          styles.passGroup,
                          { backgroundColor: colors.inputBg, borderColor: colors.border },
                        ]}
                      >
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          placeholder="Min. 6 characters"
                          placeholderTextColor={colors.textMuted}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          secureTextEntry={!showNewPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={styles.eyeIconContainer}
                          onPress={() => setShowNewPassword(!showNewPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.formLabel, { color: colors.text, marginTop: 16 }]}>
                        Confirm New Password
                      </Text>
                      <View
                        style={[
                          styles.passGroup,
                          { backgroundColor: colors.inputBg, borderColor: colors.border },
                        ]}
                      >
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          placeholder="Re-enter new password"
                          placeholderTextColor={colors.textMuted}
                          value={confirmNewPassword}
                          onChangeText={setConfirmNewPassword}
                          secureTextEntry={!showConfirmNewPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          onSubmitEditing={handleResetPasswordSubmit}
                        />
                        <TouchableOpacity
                          style={styles.eyeIconContainer}
                          onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name={showConfirmNewPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.loginButton,
                          { backgroundColor: colors.primary },
                          forgotLoading && styles.disabledBtn,
                        ]}
                        onPress={handleResetPasswordSubmit}
                        disabled={forgotLoading}
                        activeOpacity={0.8}
                      >
                        {forgotLoading ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <View style={styles.btnRow}>
                            <Ionicons name="key-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.loginButtonText}>Reset Password</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </>
                  )}

                  {!isOtpInputView && (
                    <TouchableOpacity
                      onPress={() => {
                        setForgotMode(false);
                        setForgotStep(1);
                        setForgotOtp("");
                        setErrorMessage("");
                      }}
                      activeOpacity={0.7}
                      style={[styles.actionLinkBtn, { alignSelf: "center", marginTop: 18 }]}
                    >
                      <Ionicons
                        name="arrow-back-outline"
                        size={16}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.actionLinkText, { color: colors.primary, fontSize: 13 }]}>
                        Back to Sign In
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* =================================================== */}
                  {/* PASSCODE (EMAIL OTP) FLOW                           */}
                  {/* =================================================== */}
                  {authMethod === "passcode" && (
                    <>
                      {step === 1 ? (
                        <View style={styles.formGroup}>
                          <Text style={[styles.formLabel, { color: colors.text }]}>
                            Registered Email Address
                          </Text>
                          <View
                            style={[
                              styles.inputIconWrapper,
                              {
                                backgroundColor: colors.inputBg,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Ionicons
                              name="mail-outline"
                              size={20}
                              color={colors.textMuted}
                              style={styles.inputAddonIcon}
                            />
                            <TextInput
                              style={[styles.textInput, { color: colors.text }]}
                              placeholder="Enter registered email address"
                              placeholderTextColor={colors.textMuted}
                              value={identifier}
                              onChangeText={setIdentifier}
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              returnKeyType="done"
                              onSubmitEditing={handleRequestPasscode}
                            />
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.loginButton,
                              { backgroundColor: colors.primary },
                              requestingPasscode && styles.disabledBtn,
                            ]}
                            onPress={handleRequestPasscode}
                            disabled={requestingPasscode}
                            activeOpacity={0.8}
                          >
                            {requestingPasscode ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <View style={styles.btnRow}>
                                <Ionicons name="key" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.loginButtonText}>Send 6-Digit OTP</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.formGroup}>
                          {renderOtpBoxes(passcode, setPasscode, passcodeInputRef, step === 2)}

                          <View style={styles.passcodeActionsRow}>
                            <TouchableOpacity
                              onPress={() => {
                                setStep(1);
                                setPasscode("");
                                setErrorMessage("");
                              }}
                              activeOpacity={0.7}
                              style={styles.actionLinkBtn}
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={14}
                                color={colors.textMuted}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={[styles.actionLinkText, { color: colors.textMuted }]}>
                                Change Email
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              disabled={resendCooldown > 0 || requestingPasscode}
                              onPress={handleRequestPasscode}
                              activeOpacity={0.7}
                              style={styles.actionLinkBtn}
                            >
                              <Ionicons
                                name="refresh-outline"
                                size={14}
                                color={resendCooldown > 0 ? colors.textMuted : colors.primary}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.actionLinkText,
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
                              styles.loginButton,
                              { backgroundColor: colors.primary },
                              (loading || passcode.length !== 6) && styles.disabledBtn,
                            ]}
                            onPress={handleVerifyPasscode}
                            disabled={loading || passcode.length !== 6}
                            activeOpacity={0.8}
                          >
                            {loading ? (
                              <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                              <View style={styles.btnRow}>
                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                <Text style={styles.loginButtonText}>Verify & Sign In</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}

                  {/* =================================================== */}
                  {/* PASSWORD FLOW                                       */}
                  {/* =================================================== */}
                  {authMethod === "password" && (
                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>
                        Email Address
                      </Text>
                      <View
                        style={[
                          styles.inputIconWrapper,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          placeholder="Enter registered email address"
                          placeholderTextColor={colors.textMuted}
                          value={identifier}
                          onChangeText={setIdentifier}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>

                      <View style={styles.passwordLabelRow}>
                        <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>
                          Password
                        </Text>
                        <TouchableOpacity onPress={handleStartForgotPassword} activeOpacity={0.7}>
                          <Text style={[styles.forgotPassText, { color: colors.primary }]}>
                            Forgot Password?
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View
                        style={[
                          styles.passGroup,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                        <TextInput
                          style={[styles.textInput, { color: colors.text }]}
                          placeholder="Enter your password"
                          placeholderTextColor={colors.textMuted}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                          onSubmitEditing={handlePasswordLogin}
                        />
                        <TouchableOpacity
                          style={styles.eyeIconContainer}
                          onPress={() => setShowPassword(!showPassword)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Sign In Button */}
                      <TouchableOpacity
                        style={[
                          styles.loginButton,
                          { backgroundColor: colors.primary, marginTop: 22 },
                          loading && styles.disabledBtn,
                        ]}
                        onPress={handlePasswordLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.loginButtonText}>Sign In with Password</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Help / Footer */}
              <View style={styles.footerSection}>
                <Text style={[styles.footerText, { color: colors.textMuted }]}>
                  Need help accessing your parent portal? Contact your school administration office.
                </Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  mainContent: {
    width: "100%",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoImage: {
    width: 250,
    height: 72,
  },
  headerTextSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  portalBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  portalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  authMethodTabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 26,
  },
  authMethodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  authMethodTabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  formGroup: {
    width: "100%",
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  inputIconWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputAddonIcon: {
    marginRight: 10,
  },
  passGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeIconContainer: {
    padding: 4,
  },
  forgotPassText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.65,
  },
  passcodeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 14,
    position: "relative",
  },
  digitBox: {
    flex: 1,
    height: 54,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  digitText: {
    fontSize: 22,
    fontWeight: "700",
  },
  hiddenPasscodeInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  passcodeActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  actionLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  footerSection: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
