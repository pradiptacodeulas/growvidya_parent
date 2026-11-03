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
  Alert,
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

const SAVED_IDENTIFIER_KEY = "@parent_saved_identifier";
const REMEMBER_ME_KEY = "@parent_remember_me";

export default function SignInScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark } = useAppTheme();
  const { loading } = useSelector((state: RootState) => state.auth);

  // Authentication Mode: 'passcode' (modern OTP) or 'password' (fallback)
  const [authMethod, setAuthMethod] = useState<"passcode" | "password">("passcode");

  // Passcode flow step: 1 (Enter Identifier) or 2 (Enter 6-Digit Passcode)
  const [step, setStep] = useState<1 | 2>(1);

  // Common identifier: Parent Email or Phone number
  const [identifier, setIdentifier] = useState("");

  // Password-based authentication states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Passcode-based authentication states
  const [passcode, setPasscode] = useState("");
  const [testPasscode, setTestPasscode] = useState<string | null>(null);
  const [maskedIdentifier, setMaskedIdentifier] = useState("");
  const [requestingPasscode, setRequestingPasscode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [errorMessage, setErrorMessage] = useState("");

  const passcodeInputRef = useRef<TextInput>(null);

  const logoSource = isDark
    ? require("@/assets/images/logo_dark.png")
    : require("@/assets/images/logo.png");

  // Load saved identifier and rememberMe preference on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const [savedId, savedRemember] = await Promise.all([
          AsyncStorage.getItem(SAVED_IDENTIFIER_KEY),
          AsyncStorage.getItem(REMEMBER_ME_KEY),
        ]);
        if (savedRemember !== null) {
          setRememberMe(savedRemember === "true");
        }
        if (savedId && savedRemember !== "false") {
          setIdentifier(savedId);
        }
      } catch (e) {
        // Ignore storage read errors
      }
    };
    loadSavedCredentials();
  }, []);

  const persistIdentifierPreference = async (cleanId: string, shouldRemember: boolean) => {
    try {
      await AsyncStorage.setItem(REMEMBER_ME_KEY, String(shouldRemember));
      if (shouldRemember && cleanId) {
        await AsyncStorage.setItem(SAVED_IDENTIFIER_KEY, cleanId);
      } else {
        await AsyncStorage.removeItem(SAVED_IDENTIFIER_KEY);
      }
    } catch (e) {
      // Ignore storage write errors
    }
  };

  // Countdown timer for passcode resend cooldown
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Request 6-digit passcode
  const handleRequestPasscode = async () => {
    setErrorMessage("");
    const cleanId = identifier.trim();
    if (!cleanId) {
      const msg = "Please enter your registered email or phone number.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    setRequestingPasscode(true);
    try {
      const response = await apiFetch("/parent/auth/request-passcode", {
        method: "POST",
        body: JSON.stringify({ identifier: cleanId }),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to generate passcode.");
      }

      const resData = response.data || {};
      setMaskedIdentifier(resData.maskedIdentifier || cleanId);
      if (resData.testPasscode) {
        setTestPasscode(String(resData.testPasscode));
      } else {
        setTestPasscode(null);
      }
      setPasscode("");
      setStep(2);
      setResendCooldown(30);

      Toast.show({
        type: "success",
        text1: "Passcode Generated! 🔑",
        text2: "A 6-digit passcode has been generated successfully.",
      });

      setTimeout(() => {
        passcodeInputRef.current?.focus();
      }, 300);
    } catch (err: any) {
      const msg = cleanErrorMessage(
        err?.message,
        "Failed to request passcode. Please check your details."
      );
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Request Failed", text2: msg });
    } finally {
      setRequestingPasscode(false);
    }
  };

  // Verify 6-digit passcode & sign in
  const handleVerifyPasscode = async () => {
    setErrorMessage("");
    const cleanCode = passcode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      const msg = "Please enter the full 6-digit passcode.";
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Validation Error", text2: msg });
      return;
    }

    const cleanId = identifier.trim();
    try {
      const resultAction = await dispatch(
        loginWithPasscode({
          identifier: cleanId,
          passcode: cleanCode,
        })
      );

      if (loginWithPasscode.rejected.match(resultAction)) {
        const msg = cleanErrorMessage(
          resultAction.payload as string,
          "Invalid or expired 6-digit passcode. Please try again."
        );
        setErrorMessage(msg);
        Toast.show({ type: "error", text1: "Verification Failed", text2: msg });
      } else {
        await persistIdentifierPreference(cleanId, rememberMe);
        Toast.show({
          type: "success",
          text1: "Welcome Back! 👋",
          text2: "Signed in successfully via passcode.",
        });
      }
    } catch (error: any) {
      const msg = cleanErrorMessage(
        error?.message,
        "Unable to verify passcode. Please check connection."
      );
      setErrorMessage(msg);
      Toast.show({ type: "error", text1: "Verification Failed", text2: msg });
    }
  };

  // Password-based login fallback
  const handlePasswordLogin = async () => {
    setErrorMessage("");
    const cleanId = identifier.trim();
    if (!cleanId) {
      const msg = "Please enter your registered email address.";
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
          email: cleanId,
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
        await persistIdentifierPreference(cleanId, rememberMe);
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

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "You can sign in directly using a 6-digit Passcode (OTP) or contact your school administration office to reset your password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use Passcode (OTP)",
          onPress: () => {
            setAuthMethod("passcode");
            setStep(1);
            setPasscode("");
            setErrorMessage("");
          },
        },
      ]
    );
  };

  // 6-digit interactive passcode boxes
  const renderPasscodeBoxes = () => {
    const digits = passcode.split("");
    return (
      <TouchableOpacity
        style={styles.passcodeContainer}
        activeOpacity={1}
        onPress={() => passcodeInputRef.current?.focus()}
      >
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const digit = digits[index] || "";
          const isCurrent =
            passcode.length === index || (passcode.length === 6 && index === 5);
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
          ref={passcodeInputRef}
          style={styles.hiddenPasscodeInput}
          value={passcode}
          onChangeText={(text) =>
            setPasscode(text.replace(/[^0-9]/g, "").slice(0, 6))
          }
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={step === 2}
        />
      </TouchableOpacity>
    );
  };

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
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
            </View>

            {/* Header Text Section */}
            <View style={styles.headerTextSection}>
              <View style={[styles.portalBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="people" size={14} color={colors.primary} />
                <Text style={[styles.portalBadgeText, { color: colors.primary }]}>
                  PARENT PORTAL
                </Text>
              </View>
              <Text style={[styles.titleText, { color: colors.text }]}>
                {authMethod === "passcode" && step === 2
                  ? "Enter Passcode"
                  : "Parent Sign In"}
              </Text>
              <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
                {authMethod === "passcode"
                  ? step === 1
                    ? "Sign in securely with a 6-digit passcode (OTP)"
                    : `Enter the 6-digit passcode sent to ${maskedIdentifier || identifier}`
                  : "Enter your registered credentials to sign in"}
              </Text>
            </View>

            {/* Authentication Method Segmented Tabs */}
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
                  Passcode (OTP)
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
            {/* PASSCODE FLOW                                      */}
            {/* =================================================== */}
            {authMethod === "passcode" && (
              <>
                {step === 1 ? (
                  /* Step 1: Identifier Input */
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>
                      Registered Email or Phone Number
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
                        name="person-outline"
                        size={20}
                        color={colors.textMuted}
                        style={styles.inputAddonIcon}
                      />
                      <TextInput
                        style={[styles.textInput, { color: colors.text }]}
                        placeholder="Enter email or phone number"
                        placeholderTextColor={colors.textMuted}
                        value={identifier}
                        onChangeText={setIdentifier}
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
                          <Text style={styles.loginButtonText}>Get 6-Digit Passcode</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Step 2: 6-Digit Passcode Input */
                  <View style={styles.formGroup}>
                    {/* Test Mode Autofill Banner */}
                    {testPasscode && (
                      <View
                        style={[
                          styles.testBanner,
                          {
                            backgroundColor: isDark ? "#451A03" : "#FEF3C7",
                            borderColor: isDark ? "#78350F" : "#FDE68A",
                          },
                        ]}
                      >
                        <View style={styles.testBannerHeader}>
                          <View style={styles.testBadge}>
                            <Ionicons name="flask-outline" size={12} color="#D97706" />
                            <Text style={styles.testBadgeText}>Test Mode Active</Text>
                          </View>
                          <Text
                            style={[
                              styles.testExpireText,
                              { color: isDark ? "#FCD34D" : "#92400E" },
                            ]}
                          >
                            Valid for 10 mins
                          </Text>
                        </View>

                        <View style={styles.testCodeRow}>
                          <Text
                            style={[
                              styles.testCodeLabel,
                              { color: isDark ? "#FEF3C7" : "#78350F" },
                            ]}
                          >
                            Your Passcode:
                          </Text>
                          <View style={styles.testCodePill}>
                            <Text style={styles.testCodeText}>{testPasscode}</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[styles.autofillBtn, { backgroundColor: colors.primary }]}
                          onPress={() => setPasscode(testPasscode)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="copy-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.autofillBtnText}>Click to Autofill Passcode</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <Text style={[styles.formLabel, { color: colors.text, textAlign: "center" }]}>
                      Enter 6-Digit Passcode
                    </Text>

                    {renderPasscodeBoxes()}

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
                          Change ID / Phone
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
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Passcode"}
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
            {/* PASSWORD FLOW (FALLBACK)                            */}
            {/* =================================================== */}
            {authMethod === "password" && (
              <View style={styles.formGroup}>
                {/* Email Address */}
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
                  <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputAddonIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your registered email"
                    placeholderTextColor={colors.textMuted}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password */}
                <Text style={[styles.formLabel, { color: colors.text, marginTop: 20 }]}>
                  Password
                </Text>
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

                {/* Remember Me & Forgot Password */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity
                    style={styles.rememberMeGroup}
                    onPress={() => {
                      const nextVal = !rememberMe;
                      setRememberMe(nextVal);
                      persistIdentifierPreference(identifier.trim(), nextVal);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: rememberMe ? colors.primary : colors.border,
                          backgroundColor: rememberMe ? colors.primary : "transparent",
                        },
                      ]}
                    >
                      {rememberMe && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.rememberMeText, { color: colors.textSecondary }]}>
                      Remember me
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                    <Text style={[styles.forgotPassText, { color: colors.primary }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Sign In Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    { backgroundColor: colors.primary, marginTop: 4 },
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
    marginBottom: 28,
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
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  rememberMeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  rememberMeText: {
    fontSize: 13,
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
    marginVertical: 18,
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
    marginTop: 12,
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
  testBanner: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  testBannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  testBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  testBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    textTransform: "uppercase",
  },
  testExpireText: {
    fontSize: 11,
    fontWeight: "500",
  },
  testCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  testCodeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  testCodePill: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
  },
  testCodeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
  },
  autofillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  autofillBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  footerSection: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});
