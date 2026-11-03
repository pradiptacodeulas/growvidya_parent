import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Activity" />
      <Stack.Screen name="Attendance" />
      <Stack.Screen name="ChangePassword" />
      <Stack.Screen name="Document" />
      <Stack.Screen name="EditProfile" />
      <Stack.Screen name="Events" />
      <Stack.Screen name="ExamResult" />
      <Stack.Screen name="Fees" />
      <Stack.Screen name="Holidays" />
      <Stack.Screen name="Hostel" />
      <Stack.Screen name="Medical" />
      <Stack.Screen name="Profile" />
      <Stack.Screen name="StudyMaterial" />
      <Stack.Screen name="Syllabus" />
      <Stack.Screen name="Timetable" />
      <Stack.Screen name="Transport" />
    </Stack>
  );
}
