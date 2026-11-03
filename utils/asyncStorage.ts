import AsyncStorage from "@react-native-async-storage/async-storage";

export const storeData = async (
  key: string,
  value: any,
): Promise<boolean> => {
  try {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, data);
    return true;
  } catch (e) {
    return false;
  }
};

export const getData = async (key: string): Promise<any | undefined> => {
  try {
    const response = await AsyncStorage.getItem(key);
    if (response === null) {
      return undefined;
    }
    try {
      return JSON.parse(response);
    } catch (e) {
      return response;
    }
  } catch (e) {
    return undefined;
  }
};

export const removeData = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    return false;
  }
};
