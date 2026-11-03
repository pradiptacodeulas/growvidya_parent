import SelectionBottomSheet from "@/components/common/SelectionBottomSheet";
import SubHeader from "@/components/dashboard/SubHeader";
import { updateProfile, updateProfilePicture } from "@/redux/auth/authThunk";
import { AppDispatch, RootState } from "@/redux/store";
import { fetchWithTimeout, safeParseJson, cleanErrorMessage } from "@/utils/api";
import { apiFetch, getAvatarUrl } from "@/services/apiClient";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, ChevronDown, User, MapPin } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { useAppTheme } from "@/theme";

const EditProfile = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { user, loading: authLoading } = useSelector(
    (state: RootState) => state.auth,
  );

  const [formData, setFormData] = useState({
    first_name: user?.firstName || user?.first_name || "",
    last_name: user?.lastName || user?.last_name || "",
    occupation: user?.occupation || "",
    address1: user?.address1 || "",
    address2: user?.address2 || "",
    country: user?.country || "",
    state: user?.state || "",
    city: user?.city || "",
  });

  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);

  // Bottom Sheet ref
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [modalType, setModalType] = useState<
    "country" | "state" | "city" | null
  >(null);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        first_name: user.firstName || user.first_name || prev.first_name,
        last_name: user.lastName || user.last_name || prev.last_name,
        occupation: user.occupation || prev.occupation,
        address1: user.address1 || prev.address1,
        address2: user.address2 || prev.address2,
        country: user.country || prev.country,
        state: user.state || prev.state,
        city: user.city || prev.city,
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchCountries();
    if (formData.country) fetchStates(formData.country.toString());
    if (formData.state) fetchCities(formData.state.toString());
  }, []);

  const normalizeData = (rawData: any, type: "country" | "state" | "city") => {
    const data = rawData || [];
    return data.map((item: any) => {
      switch (type) {
        case "country":
          return { id: item.id || item.id_country, name: item.name || item.country };
        case "state":
          return { id: item.id_state || item.id, name: item.state || item.name };
        case "city":
          return { id: item.id_city || item.id, name: item.city || item.name };
        default:
          return { id: item.id, name: item.name };
      }
    });
  };

  const fetchCountries = async () => {
    setModalLoading(true);
    try {
      const resData = await apiFetch("/saas/locations/countries");
      if (resData.success && resData.data) {
        setCountries(normalizeData(resData.data, "country"));
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Connection Notice",
        text2: cleanErrorMessage((e as any)?.message, "Unable to load countries. Please check your connection."),
      });
    } finally {
      setModalLoading(false);
    }
  };

  const fetchStates = async (countryId: string) => {
    if (!countryId) return;
    setModalLoading(true);
    try {
      const resData = await apiFetch(`/saas/locations/states/${countryId}`);
      if (resData.success && resData.data) {
        setStates(normalizeData(resData.data, "state"));
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Connection Notice",
        text2: cleanErrorMessage((e as any)?.message, "Unable to load states. Please check your connection."),
      });
    } finally {
      setModalLoading(false);
    }
  };

  const fetchCities = async (stateId: string) => {
    if (!stateId) return;
    setModalLoading(true);
    try {
      const resData = await apiFetch(`/saas/locations/cities/${stateId}`);
      if (resData.success && resData.data) {
        setCities(normalizeData(resData.data, "city"));
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: "Connection Notice",
        text2: cleanErrorMessage((e as any)?.message, "Unable to load cities. Please check your connection."),
      });
    } finally {
      setModalLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);

      setLoading(true);
      const res = await dispatch(updateProfilePicture(selectedImage));
      setLoading(false);

      if (updateProfilePicture.fulfilled.match(res)) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Profile picture updated successfully",
        });
      } else {
        const picMsg = cleanErrorMessage(res?.payload, "Failed to update profile picture. Please verify the image format and size.");
        Toast.show({
          type: "error",
          text1: "Upload Failed",
          text2: picMsg,
        });
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await dispatch(updateProfile(formData));
    setLoading(false);

    if (updateProfile.fulfilled.match(res)) {
      Toast.show({
        type: "success",
        text1: "Profile Updated",
        text2: "Your profile details have been saved successfully.",
      });
      router.back();
    } else {
      const errDetail = cleanErrorMessage(res.payload as string, "Failed to update profile. Please verify your entries.");
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: errDetail,
      });
    }
  };

  const isInvalidValue = (val: any) => {
    if (val === null || val === undefined) return true;

    if (typeof val === "object") {
      if (Array.isArray(val)) return val.length === 0;
      return Object.keys(val).length === 0;
    }

    const s = String(val).trim().toLowerCase();
    return (
      s === "" ||
      s === "0" ||
      s === "-1" ||
      s === "null" ||
      s === "undefined" ||
      s.includes("select") ||
      s.includes("object") ||
      s === "state" ||
      s === "city" ||
      s === "country"
    );
  };

  const openBottomSheet = (type: "country" | "state" | "city") => {
    Keyboard.dismiss();

    if (type === "state" && isInvalidValue(formData.country)) {
      return;
    }

    if (type === "city" && isInvalidValue(formData.state)) {
      return;
    }

    if (bottomSheetModalRef.current) {
      setModalType(type);
      setTimeout(() => {
        bottomSheetModalRef.current?.present();
      }, 50);
    }
  };

  const handleSelect = (item: any) => {
    if (modalType === "country") {
      setFormData({
        ...formData,
        country: item.id,
        state: "",
        city: "",
      });
      setStates([]);
      setCities([]);
      fetchStates(item.id.toString());
    } else if (modalType === "state") {
      setFormData({ ...formData, state: item.id, city: "" });
      setCities([]);
      fetchCities(item.id.toString());
    } else if (modalType === "city") {
      setFormData({ ...formData, city: item.id });
    }
  };

  const getModalData = () => {
    if (modalType === "country") return countries;
    if (modalType === "state") return states;
    if (modalType === "city") return cities;
    return [];
  };

  const getModalTitle = () => {
    if (modalType === "country") return "Select Country";
    if (modalType === "state") return "Select State";
    if (modalType === "city") return "Select City";
    return "";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SubHeader title="Edit Profile" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
            {image || user?.picture ? (
              <Image
                source={{
                  uri: image || getAvatarUrl(user?.picture, user?.gender),
                }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.placeholderAvatar, { backgroundColor: colors.surfaceSubtle }]}>
                <Camera size={40} color={colors.textMuted} />
              </View>
            )}
            <View style={[styles.cameraIcon, { backgroundColor: colors.primary, borderColor: colors.cardBg }]}>
              <Camera size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textMuted }]}>Tap to change photo</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <SectionHeader title="Personal Information" icon={<User size={20} color={colors.primary} />} colors={colors} />
          <InputLabel label="First Name" colors={colors} />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={formData.first_name}
            onChangeText={(text) =>
              setFormData({ ...formData, first_name: text })
            }
            placeholder="First Name"
            placeholderTextColor={colors.textMuted}
          />

          <InputLabel label="Last Name" colors={colors} />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={formData.last_name}
            onChangeText={(text) =>
              setFormData({ ...formData, last_name: text })
            }
            placeholder="Last Name"
            placeholderTextColor={colors.textMuted}
          />

          <InputLabel label="Occupation" colors={colors} />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={formData.occupation}
            onChangeText={(text) =>
              setFormData({ ...formData, occupation: text })
            }
            placeholder="Occupation"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.cardBg, borderColor: colors.border, marginTop: 20 }]}>
          <SectionHeader title="Address Details" icon={<MapPin size={20} color={colors.primary} />} colors={colors} />
          <InputLabel label="Address Line 1" colors={colors} />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={formData.address1}
            onChangeText={(text) =>
              setFormData({ ...formData, address1: text })
            }
            placeholder="Address Line 1"
            placeholderTextColor={colors.textMuted}
          />

          <InputLabel label="Address Line 2" colors={colors} />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={formData.address2}
            onChangeText={(text) =>
              setFormData({ ...formData, address2: text })
            }
            placeholder="Address Line 2"
            placeholderTextColor={colors.textMuted}
          />

          <InputLabel label="Country" colors={colors} />
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => openBottomSheet("country")}
          >
            <Text style={[styles.inputText, { color: colors.text }]}>
              {countries.find((c) => String(c.id) === String(formData.country))
                ?.name || "Select Country"}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <InputLabel label="State" colors={colors} />
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => openBottomSheet("state")}
          >
            <Text style={[styles.inputText, { color: colors.text }]}>
              {states.find((s) => String(s.id) === String(formData.state))
                ?.name || "Select State"}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <InputLabel label="City" colors={colors} />
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => openBottomSheet("city")}
          >
            <Text style={[styles.inputText, { color: colors.text }]}>
              {cities.find((c) => String(c.id) === String(formData.city))
                ?.name || "Select City"}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            (loading || authLoading) && styles.disabledButton,
          ]}
          onPress={handleSave}
          disabled={loading || authLoading}
          activeOpacity={0.8}
        >
          {loading || authLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Update Profile</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <SelectionBottomSheet
        ref={bottomSheetModalRef}
        title={getModalTitle()}
        data={getModalData()}
        onSelect={handleSelect}
        onDismiss={() => setModalType(null)}
        loading={modalLoading}
      />
    </View>
  );
};

const InputLabel = ({ label, colors }: { label: string; colors: any }) => (
  <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
);

const SectionHeader = ({ title, icon, style, colors }: { title: string; icon?: React.ReactNode; style?: any; colors: any }) => (
  <View style={[styles.sectionHeader, style]}>
    {icon && <View style={[styles.iconWrapper, { backgroundColor: colors.badgeBg }]}>{icon}</View>}
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 40 },
  avatarSection: { alignItems: "center", marginBottom: 25, marginTop: 20 },
  avatarWrapper: { position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  placeholderAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 8,
    borderRadius: 15,
    borderWidth: 2,
  },
  avatarHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputText: { fontSize: 15, fontWeight: "600" },
  saveButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 25,
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: "#FFF", fontSize: 18, fontWeight: "900" },
});

export default EditProfile;
