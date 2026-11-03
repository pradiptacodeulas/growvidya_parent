import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { apiFetch, setAuthToken } from "@/services/apiClient";
import { storeData } from "@/utils/asyncStorage";

export const fetchDashboardData = createAsyncThunk(
  "home/fetchDashboardData",
  async (studentId: string | undefined, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (!token) {
      return rejectWithValue("Authentication required");
    }

    setAuthToken(token);

    const targetStudentId =
      studentId ||
      state.home.selectedStudentId ||
      state.auth.user?.activeChild?.id ||
      state.auth.user?.children?.[0]?.id ||
      state.auth.user?.student_id;

    try {
      const endpoint = targetStudentId
        ? `/parent/dashboard?student_id=${targetStudentId}`
        : `/parent/dashboard`;

      const response = await apiFetch(endpoint, {
        method: "GET",
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch dashboard data");
      }

      const raw = response.data;

      // Adapt modern server payload to support both legacy and modern UI bindings
      const activeChild = raw.activeChild || (raw.children && raw.children.length > 0 ? raw.children[0] : null);
      const children = raw.children || [];
      const attendance = raw.attendance || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        halfday: 0,
        percentage: 100,
      };
      const fees = raw.fees || {
        totalDue: 0,
        totalOutstandingDue: 0,
        totalDueThisMonth: 0,
        totalPaid: 0,
        totalAmount: 0,
      };

      const normalized = {
        ...raw,
        // UI backward compatibility bridges
        student_details: activeChild,
        parent_student: children,
        student_attendance_data: {
          present: attendance.present || 0,
          late: attendance.late || 0,
          half: attendance.halfday || 0,
          absent: attendance.absent || 0,
          total: attendance.total || 0,
          percentage: attendance.percentage || 100,
        },
        today_class: raw.todayClasses || [],
        notices: raw.notices || [],
        events: raw.events || [],
        holidays: raw.holidays || [],
        student_due_fees: raw.due_this_month || raw.dueFees || raw.student_due_fees || raw.fees?.dueFees || raw.fees?.due_this_month || [],
        due_this_month: raw.due_this_month || raw.dueFees || raw.student_due_fees || raw.fees?.dueFees || raw.fees?.due_this_month || [],
      };

      return normalized;
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred while loading dashboard");
    }
  }
);

export const fetchExamResult = createAsyncThunk(
  "home/fetchExamResult",
  async (
    { examId, studentId }: { examId: string; studentId: string },
    { getState, rejectWithValue }
  ) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (!token) {
      return rejectWithValue("Authentication required");
    }

    setAuthToken(token);

    try {
      const response = await apiFetch(
        `/parent/child/exam-results?student_id=${studentId}`,
        { method: "GET" }
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to fetch exam result");
      }

      // Find specific exam result if examId provided, or return all
      const allResults = Array.isArray(response.data) ? response.data : [response.data];
      const match = allResults.find((r: any) => String(r.exam_id) === String(examId) || String(r.exam_result_id) === String(examId));

      return { examId, data: match || allResults[0] || null, allResults };
    } catch (error: any) {
      return rejectWithValue(error.message || "An unexpected error occurred while fetching exam results");
    }
  }
);

export const switchActiveStudent = createAsyncThunk(
  "home/switchActiveStudent",
  async (studentId: string | number, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiFetch("/parent/auth/switch-student", {
        method: "POST",
        body: JSON.stringify({ student_id: Number(studentId) }),
      });

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to switch active student");
      }

      // Refresh dashboard with newly switched active child
      await dispatch(fetchDashboardData(String(studentId)));

      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to switch student");
    }
  }
);

export const fetchStudyMaterials = createAsyncThunk(
  "home/fetchStudyMaterials",
  async (studentId: string | number, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (token) {
      setAuthToken(token);
    }

    try {
      const response = await apiFetch(
        `/parent/child/study-materials?student_id=${studentId}`,
        { method: "GET" }
      );

      if (!response.success) {
        return rejectWithValue(response.message || "Failed to fetch study materials");
      }

      const rawData = response.data?.study_materials || response.data;
      return Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unexpected error occurred while fetching study materials"
      );
    }
  }
);

export const fetchMaterialTypes = createAsyncThunk(
  "home/fetchMaterialTypes",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (token) {
      setAuthToken(token);
    }

    try {
      const response = await apiFetch("/parent/child/material-types", {
        method: "GET",
      });

      if (!response.success) {
        return rejectWithValue(response.message || "Failed to fetch material types");
      }

      const rawData = response.data?.material_types || response.data;
      return Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unexpected error occurred while fetching material types"
      );
    }
  }
);

export const fetchChildSyllabus = createAsyncThunk(
  "home/fetchChildSyllabus",
  async (studentId: string | number, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (token) {
      setAuthToken(token);
    }

    try {
      const response = await apiFetch(
        `/parent/child/syllabus?student_id=${studentId}`,
        { method: "GET" }
      );

      if (!response.success) {
        return rejectWithValue(response.message || "Failed to fetch syllabus");
      }

      const rawData = response.data?.syllabus || response.data?.data || response.data;
      return Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unexpected error occurred while fetching syllabus"
      );
    }
  }
);

export interface HolidayItem {
  id: number;
  title: string;
  details?: string | null;
  from_date: string;
  to_date?: string | null;
  status?: number;
  branch_id?: number | null;
  branch_name?: string | null;
}

export const fetchChildHolidays = createAsyncThunk(
  "home/fetchChildHolidays",
  async (studentId: string | number | undefined, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const token = state.auth.token;

    if (token) {
      setAuthToken(token);
    }

    try {
      const endpoint = studentId
        ? `/parent/child/holidays?student_id=${studentId}`
        : "/parent/child/holidays";
      const response = await apiFetch(endpoint, { method: "GET" });

      if (!response.success) {
        return rejectWithValue(response.message || "Failed to fetch holidays");
      }

      const rawData = response.data?.holidays || response.data?.data || response.data;
      return (Array.isArray(rawData) ? rawData : rawData ? [rawData] : []) as HolidayItem[];
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unexpected error occurred while fetching holidays"
      );
    }
  }
);
