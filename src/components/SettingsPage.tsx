import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Building2,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';

export type UserRole = 'Staf' | 'Administrator';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unit: string;
  phone: string;
  photoUrl?: string;
}

interface SettingsPageProps {
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
}

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const PROFILE_KEY_PREFIX = 'land-monitor-profile:';
const PASSWORD_KEY_PREFIX = 'land-monitor-password:';

export const getProfileStorageKey = (email: string) =>
  `${PROFILE_KEY_PREFIX}${email.trim().toLowerCase()}`;

export const getPasswordStorageKey = (email: string) =>
  `${PASSWORD_KEY_PREFIX}${email.trim().toLowerCase()}`;

export function saveProfileToLocalStorage(
  profile: UserProfile,
) {
  localStorage.setItem(
    getProfileStorageKey(profile.email),
    JSON.stringify(profile),
  );
}

export function readProfileFromLocalStorage(
  email: string,
): UserProfile | null {
  try {
    const raw = localStorage.getItem(
      getProfileStorageKey(email),
    );

    if (!raw) return null;

    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

const initialsFromName = (name: string) => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (
    words.map((word) => word[0]?.toUpperCase()).join('') ||
    'S'
  );
};

export function SettingsPage({
  profile,
  onProfileChange,
}: SettingsPageProps) {
  const [form, setForm] = useState<UserProfile>(profile);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<
    'success' | 'error'
  >('success');

  const [photoError, setPhotoError] = useState('');

  const [currentPassword, setCurrentPassword] =
    useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(
    null,
  );

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const initials = useMemo(
    () => initialsFromName(form.name),
    [form.name],
  );

  const hasProfileChanges = useMemo(() => {
    return (
      form.name !== profile.name ||
      form.unit !== profile.unit ||
      form.phone !== profile.phone ||
      form.photoUrl !== profile.photoUrl
    );
  }, [form, profile]);

  const showMessage = (
    text: string,
    type: 'success' | 'error',
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const updateField = (
    field: 'name' | 'unit' | 'phone',
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage('');
  };

  const handlePhotoChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setPhotoError('');
    setMessage('');

    if (!file.type.startsWith('image/')) {
      setPhotoError(
        'File harus berupa gambar JPG, PNG, atau WEBP.',
      );
      event.target.value = '';
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError(
        'Ukuran foto maksimal 2 MB untuk prototype frontend.',
      );
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const photoUrl = reader.result;
      if (typeof photoUrl !== 'string') return;

      setForm((previous) => ({
        ...previous,
        photoUrl,
      }));
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const resetUnsavedProfile = () => {
    setForm(profile);
    setPhotoError('');
    setMessage('');
  };

  const handleSaveProfile = () => {
    if (!form.name.trim()) {
      showMessage('Nama lengkap wajib diisi.', 'error');
      return;
    }

    if (!form.unit.trim()) {
      showMessage(
        'Unit / satuan kerja wajib diisi.',
        'error',
      );
      return;
    }

    const nextProfile: UserProfile = {
      ...form,
      name: form.name.trim(),
      unit: form.unit.trim(),
      phone: form.phone.trim(),
      // Identitas login dan hak akses tetap mengikuti akun.
      email: profile.email,
      role: profile.role,
    };

    saveProfileToLocalStorage(nextProfile);
    onProfileChange(nextProfile);
    setForm(nextProfile);

    showMessage(
      'Profil berhasil diperbarui. Nama dan foto langsung diterapkan pada Dashboard, header, dan sidebar.',
      'success',
    );
  };

  const handleChangePassword = () => {
    const passwordKey = getPasswordStorageKey(
      profile.email,
    );

    const storedPassword =
      localStorage.getItem(passwordKey) || '';

    if (
      storedPassword &&
      currentPassword !== storedPassword
    ) {
      showMessage(
        'Kata sandi saat ini tidak sesuai.',
        'error',
      );
      return;
    }

    if (newPassword.length < 6) {
      showMessage(
        'Kata sandi baru minimal 6 karakter.',
        'error',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(
        'Konfirmasi kata sandi baru tidak sama.',
        'error',
      );
      return;
    }

    localStorage.setItem(passwordKey, newPassword);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    showMessage(
      'Kata sandi berhasil diperbarui.',
      'success',
    );
  };

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`
            flex items-center gap-2 rounded-2xl
            border px-4 py-3
            text-[10px] font-semibold
            ${
              messageType === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }
          `}
        >
          <CheckCircle2 size={15} />
          {message}
        </div>
      )}

      {/* PROFILE OVERVIEW */}
      <section
        className="
          overflow-hidden rounded-[24px]
          border border-[#E3EBF4]
          bg-white
          shadow-[0_12px_34px_rgba(15,53,92,0.055)]
        "
      >
        <div
          className="
            relative overflow-hidden
            bg-gradient-to-r
            from-[#063A70] via-[#0756A4] to-[#0876CA]
            px-5 py-5 text-white
          "
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute right-16 top-2 h-24 w-24 rounded-full bg-cyan-300/10" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                Pengaturan Akun
              </p>

              <h2 className="mt-1 text-[20px] font-extrabold tracking-tight">
                Profil Saya
              </h2>

              <p className="mt-1 max-w-2xl text-[10px] leading-5 text-blue-100/85">
                Informasi profil ini terhubung langsung dengan
                identitas akun yang tampil pada Dashboard,
                header, sidebar, dan penugasan PIC.
              </p>
            </div>

            <span
              className="
                inline-flex w-fit items-center gap-2
                rounded-full border border-white/15
                bg-white/10 px-3 py-1.5
                text-[9px] font-semibold text-white
                backdrop-blur-sm
              "
            >
              <ShieldCheck size={13} />
              {form.role}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* IDENTITY CARD */}
          <aside
            className="
              rounded-[22px] border border-[#E5EDF5]
              bg-[#F8FBFE] p-5
            "
          >
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />

            <div className="text-center">
              <div
                className="
                  mx-auto grid h-28 w-28
                  place-items-center overflow-hidden
                  rounded-full
                  bg-gradient-to-br
                  from-[#0957A7] to-[#0B79CF]
                  text-[26px] font-extrabold text-white
                  ring-4 ring-white
                  shadow-[0_14px_30px_rgba(7,77,148,0.18)]
                "
              >
                {form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt={form.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              <p className="mt-4 text-[13px] font-extrabold text-[#0A295C]">
                {form.name || 'Nama Staf'}
              </p>

              <p className="mt-1 text-[9.5px] text-slate-500">
                {form.unit || 'Pengadaan Tanah'}
              </p>

              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    photoInputRef.current?.click()
                  }
                  className="
                    inline-flex h-9 items-center gap-2
                    rounded-xl
                    bg-gradient-to-r
                    from-[#0A55AA] to-[#0B73CA]
                    px-3 text-[9px] font-bold text-white
                    shadow-sm transition
                    hover:-translate-y-0.5
                  "
                >
                  <Camera size={13} />
                  Ganti Foto
                </button>

                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((previous) => ({
                        ...previous,
                        photoUrl: undefined,
                      }));
                      setMessage('');
                    }}
                    className="
                      grid h-9 w-9 place-items-center
                      rounded-xl border border-red-100
                      bg-red-50 text-red-500
                      transition hover:bg-red-100
                    "
                    title="Hapus foto"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <p className="mt-3 text-[8px] leading-4 text-slate-400">
                JPG, PNG, atau WEBP · maksimum 2 MB.
              </p>

              {photoError && (
                <p className="mt-2 text-[8px] font-semibold text-red-500">
                  {photoError}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-200/80 pt-4">
              <MiniInfo
                icon={<Mail size={13} />}
                label="Email Login"
                value={form.email}
              />

              <MiniInfo
                icon={<ShieldCheck size={13} />}
                label="Hak Akses"
                value={form.role}
              />
            </div>
          </aside>

          {/* FORM */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <UserRound
                size={16}
                className="text-[#0A66C2]"
              />
              <div>
                <h3 className="text-[12px] font-extrabold text-[#0A295C]">
                  Informasi Pribadi
                </h3>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  Perbarui data profil yang digunakan sistem.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SettingsField
                label="Nama Lengkap"
                icon={<UserRound size={14} />}
              >
                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      'name',
                      event.target.value,
                    )
                  }
                  placeholder="Nama lengkap staf"
                  className={inputClass}
                />
              </SettingsField>

              <SettingsField
                label="Email Login"
                icon={<Mail size={14} />}
                helper="Identitas login ditetapkan oleh akun."
              >
                <input
                  value={form.email}
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-[#F7F9FC] text-slate-400`}
                />
              </SettingsField>

              <SettingsField
                label="Unit / Satuan Kerja"
                icon={<Building2 size={14} />}
              >
                <input
                  value={form.unit}
                  onChange={(event) =>
                    updateField(
                      'unit',
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: Pengadaan Tanah"
                  className={inputClass}
                />
              </SettingsField>

              <SettingsField
                label="Nomor Telepon"
                icon={<Phone size={14} />}
              >
                <input
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      'phone',
                      event.target.value,
                    )
                  }
                  placeholder="08xxxxxxxxxx"
                  className={inputClass}
                />
              </SettingsField>

              <SettingsField
                label="Role / Hak Akses"
                icon={<ShieldCheck size={14} />}
                helper="Role tidak dapat diubah oleh user sendiri."
              >
                <input
                  value={form.role}
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-[#F7F9FC] text-slate-400`}
                />
              </SettingsField>
            </div>

            <div
              className="
                mt-5 flex items-start gap-3
                rounded-2xl border border-blue-100
                bg-[#F4F9FF] px-4 py-3
              "
            >
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-[#0A66C2]"
              />

              <p className="text-[9px] leading-5 text-[#2B5F93]">
                <strong>Relasi akun dan PIC.</strong>{' '}
                Saat backend/MySQL aktif, akun akan dihubungkan
                ke PIC melalui User ID/PIC ID. Dengan begitu,
                staf dapat memperbarui task dan sub-task sesuai
                penugasan masing-masing.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {hasProfileChanges && (
                <button
                  type="button"
                  onClick={resetUnsavedProfile}
                  className="
                    h-10 rounded-xl
                    border border-[#DCE6F1]
                    bg-white px-4
                    text-[10px] font-semibold text-slate-600
                    transition hover:bg-slate-50
                  "
                >
                  Batalkan Perubahan
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={!hasProfileChanges}
                className="
                  inline-flex h-10 items-center gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-[#0A55AA] to-[#0B73CA]
                  px-4 text-[10px] font-bold text-white
                  shadow-[0_8px_18px_rgba(11,103,198,0.18)]
                  transition
                  hover:-translate-y-0.5
                  disabled:cursor-not-allowed
                  disabled:opacity-45
                  disabled:hover:translate-y-0
                "
              >
                <Save size={14} />
                Simpan Profil
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section
        className="
          overflow-hidden rounded-[24px]
          border border-[#E3EBF4]
          bg-white
          shadow-[0_12px_34px_rgba(15,53,92,0.045)]
        "
      >
        <div className="flex items-center gap-3 border-b border-[#EEF2F7] px-5 py-4">
          <div
            className="
              grid h-9 w-9 place-items-center
              rounded-xl bg-blue-50
              text-[#0A66C2]
            "
          >
            <LockKeyhole size={16} />
          </div>

          <div>
            <h2 className="text-[13px] font-extrabold text-[#0A295C]">
              Keamanan Akun
            </h2>

            <p className="mt-0.5 text-[9px] text-slate-400">
              Perbarui kata sandi akun yang sedang digunakan.
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <PasswordInput
              label="Kata Sandi Saat Ini"
              value={currentPassword}
              onChange={setCurrentPassword}
              show={showCurrentPassword}
              onToggle={() =>
                setShowCurrentPassword(
                  (previous) => !previous,
                )
              }
            />

            <PasswordInput
              label="Kata Sandi Baru"
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggle={() =>
                setShowNewPassword(
                  (previous) => !previous,
                )
              }
            />

            <PasswordInput
              label="Konfirmasi Kata Sandi Baru"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggle={() =>
                setShowConfirmPassword(
                  (previous) => !previous,
                )
              }
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[#EEF2F7] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-[8.5px] leading-4 text-amber-600">
              Prototype frontend: kata sandi sementara disimpan
              di localStorage untuk pengujian UI. Saat backend
              aktif, autentikasi harus diproses di server dengan
              password hashing dan session/token.
            </p>

            <button
              type="button"
              onClick={handleChangePassword}
              className="
                inline-flex h-10 shrink-0
                items-center justify-center gap-2
                rounded-xl
                bg-gradient-to-r
                from-[#0A55AA] to-[#0B73CA]
                px-4 text-[10px] font-bold text-white
                transition hover:-translate-y-0.5
              "
            >
              <LockKeyhole size={14} />
              Ubah Kata Sandi
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-[#DCE6F1] bg-white px-3 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#0A66C2] focus:ring-2 focus:ring-blue-100';

function SettingsField({
  label,
  icon,
  helper,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>

      {children}

      {helper && (
        <p className="mt-1.5 text-[8px] leading-4 text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-white px-3 py-2.5">
      <span className="mt-0.5 text-[#0A66C2]">
        {icon}
      </span>

      <div className="min-w-0">
        <p className="text-[8px] font-semibold text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[9px] font-semibold text-[#0A295C]">
          {value || '-'}
        </p>
      </div>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[10px] font-bold text-slate-600">
        <LockKeyhole
          size={14}
          className="text-slate-400"
        />
        {label}
      </label>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="••••••••"
          className={`${inputClass} pr-10`}
        />

        <button
          type="button"
          onClick={onToggle}
          className="
            absolute right-3 top-1/2
            -translate-y-1/2
            text-slate-400 transition
            hover:text-slate-600
          "
          aria-label={
            show
              ? 'Sembunyikan kata sandi'
              : 'Tampilkan kata sandi'
          }
        >
          {show ? (
            <EyeOff size={14} />
          ) : (
            <Eye size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

export default SettingsPage;
