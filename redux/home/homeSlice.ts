import { createSlice } from "@reduxjs/toolkit";
import {
  fetchDashboardData,
  fetchExamResult,
  fetchStudyMaterials,
  fetchMaterialTypes,
  fetchChildSyllabus,
  fetchChildHolidays,
  HolidayItem,
} from "./homeThunk";

interface HomeState {
  dashboardData: any | null;
  termResults: Record<string, any>;
  studyMaterials: any[];
  materialTypes: any[];
  studyMaterialsLoading: boolean;
  studyMaterialsError: string | null;
  syllabus: any[];
  syllabusLoading: boolean;
  syllabusError: string | null;
  holidays: HolidayItem[];
  holidaysLoading: boolean;
  holidaysError: string | null;
  loading: boolean;
  termLoading: Record<string, boolean>;
  error: string | null;
  selectedStudentId: string | null;
}

const initialState: HomeState = {
  dashboardData: null,
  termResults: {},
  studyMaterials: [],
  materialTypes: [],
  studyMaterialsLoading: false,
  studyMaterialsError: null,
  syllabus: [],
  syllabusLoading: false,
  syllabusError: null,
  holidays: [],
  holidaysLoading: false,
  holidaysError: null,
  loading: false,
  termLoading: {},
  error: null,
  selectedStudentId: null,
};

export const homeSlice = createSlice({
  name: "home",
  initialState,
  reducers: {
    setSelectedStudentId: (state, action) => {
      if (state.selectedStudentId !== action.payload) {
        state.selectedStudentId = action.payload;
        state.dashboardData = null; // Clear previous student's data
        state.termResults = {}; // Clear previous student's results
        state.studyMaterials = []; // Clear previous student's study materials
        state.studyMaterialsError = null;
        state.syllabus = []; // Clear previous student's syllabus
        state.syllabusError = null;
        state.holidays = []; // Clear previous student's holidays
        state.holidaysError = null;
      }
    },
    clearDashboardData: (state) => {
      state.dashboardData = null;
      state.termResults = {};
      state.studyMaterials = [];
      state.materialTypes = [];
      state.studyMaterialsLoading = false;
      state.studyMaterialsError = null;
      state.syllabus = [];
      state.syllabusLoading = false;
      state.syllabusError = null;
      state.holidays = [];
      state.holidaysLoading = false;
      state.holidaysError = null;
      state.loading = false;
      state.termLoading = {};
      state.error = null;
      state.selectedStudentId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardData = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchExamResult.pending, (state, action) => {
        const { examId } = action.meta.arg;
        state.termLoading[examId] = true;
      })
      .addCase(fetchExamResult.fulfilled, (state, action) => {
        const { examId, data } = action.payload;
        state.termLoading[examId] = false;
        state.termResults[examId] = data;
      })
      .addCase(fetchExamResult.rejected, (state, action) => {
        const { examId } = action.meta.arg;
        state.termLoading[examId] = false;
      })
      .addCase(fetchStudyMaterials.pending, (state) => {
        state.studyMaterialsLoading = true;
        state.studyMaterialsError = null;
      })
      .addCase(fetchStudyMaterials.fulfilled, (state, action) => {
        state.studyMaterialsLoading = false;
        state.studyMaterials = action.payload;
        state.studyMaterialsError = null;
      })
      .addCase(fetchStudyMaterials.rejected, (state, action) => {
        state.studyMaterialsLoading = false;
        state.studyMaterials = [];
        state.studyMaterialsError = action.payload as string;
      })
      .addCase(fetchMaterialTypes.fulfilled, (state, action) => {
        state.materialTypes = action.payload;
      })
      .addCase(fetchChildSyllabus.pending, (state) => {
        state.syllabusLoading = true;
        state.syllabusError = null;
      })
      .addCase(fetchChildSyllabus.fulfilled, (state, action) => {
        state.syllabusLoading = false;
        state.syllabus = action.payload;
        state.syllabusError = null;
      })
      .addCase(fetchChildSyllabus.rejected, (state, action) => {
        state.syllabusLoading = false;
        state.syllabus = [];
        state.syllabusError = action.payload as string;
      })
      .addCase(fetchChildHolidays.pending, (state) => {
        state.holidaysLoading = true;
        state.holidaysError = null;
      })
      .addCase(fetchChildHolidays.fulfilled, (state, action) => {
        state.holidaysLoading = false;
        state.holidays = action.payload;
        state.holidaysError = null;
      })
      .addCase(fetchChildHolidays.rejected, (state, action) => {
        state.holidaysLoading = false;
        state.holidays = [];
        state.holidaysError = action.payload as string;
      });
  },
});

export const { clearDashboardData, setSelectedStudentId } = homeSlice.actions;
export default homeSlice.reducer;
