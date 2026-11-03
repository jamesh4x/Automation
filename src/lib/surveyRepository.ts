import { supabase } from './supabase';
import { checkFile, toSafeFileName, type FileKind } from './fileRules';
import type { Supplier, SupplierStatus, SurveyRecord, SurveyStatus, TeamMember } from '../types';

const SUPPLIER_COLUMNS =
  'id, name, address, province, regency, latitude, longitude, categories, contact_person, contact_info, status, notes';

const SURVEY_COLUMNS =
  'id, supplier_id, survey_date, location, product_name, survey_type, categories, contact_person, contact_info, objectives, field_notes, status, created_at, supplier:suppliers(name), survey_team_members(name, role, position), survey_files(id, kind)';

interface SupplierRow {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  regency: string | null;
  latitude: number | null;
  longitude: number | null;
  categories: string[] | null;
  contact_person: string | null;
  contact_info: string | null;
  status: SupplierStatus;
  notes: string | null;
}

interface SurveyRow {
  id: string;
  supplier_id: string;
  survey_date: string;
  location: string | null;
  product_name: string | null;
  survey_type: string | null;
  categories: string[] | null;
  contact_person: string | null;
  contact_info: string | null;
  objectives: string[] | null;
  field_notes: string | null;
  status: SurveyStatus;
  created_at: string;
  supplier: { name: string } | null;
  survey_team_members: { name: string; role: string | null; position: number }[] | null;
  survey_files: { id: string; kind: FileKind }[] | null;
}

const GENERIC_ERROR = 'Data belum dapat dimuat. Silakan coba lagi.';

const mapSupplier = (row: SupplierRow): Supplier => ({
  id: row.id,
  name: row.name,
  address: row.address,
  province: row.province,
  regency: row.regency,
  latitude: row.latitude,
  longitude: row.longitude,
  categories: row.categories ?? [],
  contactPerson: row.contact_person,
  contactInfo: row.contact_info,
  status: row.status,
  notes: row.notes,
});

const mapSurvey = (row: SurveyRow): SurveyRecord => ({
  id: row.id,
  supplierId: row.supplier_id,
  supplierName: row.supplier?.name ?? 'Supplier tidak ditemukan',
  surveyDate: row.survey_date,
  location: row.location,
  productName: row.product_name,
  surveyType: row.survey_type,
  categories: row.categories ?? [],
  contactPerson: row.contact_person,
  contactInfo: row.contact_info,
  objectives: row.objectives ?? [],
  fieldNotes: row.field_notes,
  status: row.status,
  createdAt: row.created_at,
  team: [...(row.survey_team_members ?? [])]
    .sort((a, b) => a.position - b.position)
    .map<TeamMember>((m) => ({ name: m.name, role: m.role })),
  fileKinds: (row.survey_files ?? []).map((f) => f.kind),
  recordingIds: (row.survey_files ?? []).filter((f) => f.kind === 'recording').map((f) => f.id),
});

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from('suppliers').select(SUPPLIER_COLUMNS).order('name');
  if (error) {
    console.error(error);
    throw new Error(GENERIC_ERROR);
  }
  return (data as SupplierRow[]).map(mapSupplier);
}

export async function listSurveys(): Promise<SurveyRecord[]> {
  const { data, error } = await supabase
    .from('surveys')
    .select(SURVEY_COLUMNS)
    .order('survey_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    throw new Error(GENERIC_ERROR);
  }
  return (data as unknown as SurveyRow[]).map(mapSurvey);
}

export interface NewSurveyInput {
  supplierName: string;
  surveyDate: string;
  location: string;
  productName: string;
  surveyType: string;
  categories: string[];
  contactPerson: string;
  contactInfo: string;
  objectives: string[];
  fieldNotes: string;
  team: TeamMember[];
  files: { kind: FileKind; file: File }[];
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (ch) => `\\${ch}`);

const emptyToNull = (value: string) => (value.trim() === '' ? null : value.trim());

async function findOrCreateSupplier(input: NewSurveyInput): Promise<string> {
  const name = input.supplierName.trim();
  const { data: existing, error: lookupError } = await supabase
    .from('suppliers')
    .select('id, categories')
    .ilike('name', escapeLike(name))
    .maybeSingle();
  if (lookupError) {
    console.error(lookupError);
    throw new Error('Gagal memeriksa data supplier. Silakan coba lagi.');
  }

  if (existing) {
    const merged = Array.from(new Set([...(existing.categories ?? []), ...input.categories]));
    if (merged.length !== (existing.categories ?? []).length) {
      const { error: updateError } = await supabase.from('suppliers').update({ categories: merged }).eq('id', existing.id);
      if (updateError) console.error(updateError);
    }
    return existing.id;
  }

  const id = crypto.randomUUID();
  const { error: insertError } = await supabase.from('suppliers').insert({
    id,
    name,
    categories: input.categories,
    contact_person: emptyToNull(input.contactPerson),
    contact_info: emptyToNull(input.contactInfo),
  });
  if (insertError) {
    console.error(insertError);
    throw new Error('Gagal menyimpan data supplier. Silakan coba lagi.');
  }
  return id;
}

export async function saveSurvey(input: NewSurveyInput): Promise<void> {
  const checkedFiles = input.files.map(({ kind, file }) => {
    const check = checkFile(kind, file);
    if (!check.ok) throw new Error(check.reason);
    return { kind, file, mimeType: check.mimeType };
  });

  const supplierId = await findOrCreateSupplier(input);
  const surveyId = crypto.randomUUID();

  const { error: surveyError } = await supabase.from('surveys').insert({
    id: surveyId,
    supplier_id: supplierId,
    survey_date: input.surveyDate,
    location: emptyToNull(input.location),
    product_name: emptyToNull(input.productName),
    survey_type: emptyToNull(input.surveyType),
    categories: input.categories,
    contact_person: emptyToNull(input.contactPerson),
    contact_info: emptyToNull(input.contactInfo),
    objectives: input.objectives,
    field_notes: emptyToNull(input.fieldNotes),
  });
  if (surveyError) {
    console.error(surveyError);
    throw new Error('Gagal menyimpan survei. Silakan coba lagi.');
  }

  if (input.team.length > 0) {
    const { error: teamError } = await supabase.from('survey_team_members').insert(
      input.team.map((member, position) => ({
        survey_id: surveyId,
        name: member.name.trim(),
        role: emptyToNull(member.role ?? ''),
        position,
      }))
    );
    if (teamError) {
      console.error(teamError);
      throw new Error('Survei tersimpan, tetapi anggota tim gagal dicatat. Silakan periksa ulang di Survey History.');
    }
  }

  for (const { kind, file, mimeType } of checkedFiles) {
    const storagePath = `${surveyId}/${crypto.randomUUID()}-${toSafeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from('survey-files')
      .upload(storagePath, file, { contentType: mimeType, upsert: false });
    if (uploadError) {
      console.error(uploadError);
      throw new Error(`Survei tersimpan, tetapi ${file.name} gagal diunggah. Silakan unggah ulang berkas tersebut.`);
    }

    const { error: fileError } = await supabase.from('survey_files').insert({
      survey_id: surveyId,
      kind,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: mimeType,
      size_bytes: file.size,
    });
    if (fileError) {
      console.error(fileError);
      throw new Error(`Berkas ${file.name} terunggah, tetapi pencatatannya gagal. Silakan periksa ulang.`);
    }
  }
}
