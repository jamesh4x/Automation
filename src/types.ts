import type { FileKind } from './lib/fileRules';

export type PageId =
  | 'dashboard'
  | 'new-survey'
  | 'survey-history'
  | 'supplier-database'
  | 'supplier-map'
  | 'report-management'
  | 'settings';

export type SupplierStatus = 'aktif' | 'tidak aktif' | 'evaluasi';

export type SurveyStatus = 'uploaded' | 'processing' | 'generated' | 'needs_review' | 'approved' | 'completed' | 'failed';

export interface Supplier {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  regency: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string[];
  contactPerson: string | null;
  contactInfo: string | null;
  status: SupplierStatus;
  notes: string | null;
}

export interface TeamMember {
  name: string;
  role: string | null;
}

export interface SurveyRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  surveyDate: string;
  location: string | null;
  productName: string | null;
  surveyType: string | null;
  categories: string[];
  contactPerson: string | null;
  contactInfo: string | null;
  objectives: string[];
  fieldNotes: string | null;
  status: SurveyStatus;
  createdAt: string;
  team: TeamMember[];
  fileKinds: FileKind[];
}
