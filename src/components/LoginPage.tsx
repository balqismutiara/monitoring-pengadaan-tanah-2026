import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import {
  COMPANY_NAME,
  LOGIN_HERO_IMAGE,
  PELINDO_LOGO,
} from '../branding';

import {
  getPasswordStorageKey,
  readProfileFromLocalStorage,
  saveProfileToLocalStorage,
  type UserProfile,
} from './SettingsPage';

interface LoginPageProps {
  onLogin: (profile: UserProfile) => void;
}

interface DemoAccount {
  email: string;
  password: string;
  profile: UserProfile;
}

type AuthMode = 'login' | 'register' | 'verify';

interface RegisterForm {
  name: string;
  email: string;
  unit: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'staff@landmonitor.id',
    password: 'staff123',
    profile: {
      id: 'user-staff-001',
      name: 'Staf Pengadaan Tanah',
      email: 'staff@landmonitor.id',
      role: 'Staf',
      unit: 'Pengadaan Tanah',
      phone: '',
    },
  },
  {
    email: 'admin@landmonitor.id',
    password: 'admin123',
    profile: {
      id: 'user-admin-001',
      name: 'Administrator',
      email: 'admin@landmonitor.id',
      role: 'Administrator',
      unit: 'Pengadaan Tanah',
      phone: '',
    },
  },
];

const normalizeEmail = (value: string) =>
  value.trim().toLowerCase();

const createUserId = () =>
  `user-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const generateVerificationCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const initializeDemoAccount = (
  account: DemoAccount,
) => {
  const existingProfile =
    readProfileFromLocalStorage(account.email);

  if (!existingProfile) {
    saveProfileToLocalStorage(account.profile);
  }

  const passwordKey = getPasswordStorageKey(
    account.email,
  );

  if (!localStorage.getItem(passwordKey)) {
    localStorage.setItem(
      passwordKey,
      account.password,
    );
  }
};

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    remaining,
  ).padStart(2, '0')}`;
};

export function LoginPage({
  onLogin,
}: LoginPageProps) {
  const [mode, setMode] =
    useState<AuthMode>('login');

  const [loginEmail, setLoginEmail] = useState(
    'staff@landmonitor.id',
  );

  const [loginPassword, setLoginPassword] =
    useState('staff123');

  const [rememberMe, setRememberMe] =
    useState(false);

  const [showLoginPassword, setShowLoginPassword] =
    useState(false);

  const [
    showRegisterPassword,
    setShowRegisterPassword,
  ] = useState(false);

  const [
    showRegisterConfirmPassword,
    setShowRegisterConfirmPassword,
  ] = useState(false);

  const [registerForm, setRegisterForm] =
    useState<RegisterForm>({
      name: '',
      email: '',
      unit: 'Pengadaan Tanah',
      phone: '',
      password: '',
      confirmPassword: '',
      agree: false,
    });

  const [pendingProfile, setPendingProfile] =
    useState<UserProfile | null>(null);

  const [pendingPassword, setPendingPassword] =
    useState('');

  const [verificationCode, setVerificationCode] =
    useState('');

  const [otp, setOtp] = useState<string[]>(
    Array(6).fill(''),
  );

  const [countdown, setCountdown] =
    useState(165);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const otpRefs = useRef<
    Array<HTMLInputElement | null>
  >([]);

  useEffect(() => {
    DEMO_ACCOUNTS.forEach(initializeDemoAccount);
  }, []);

  useEffect(() => {
    if (mode !== 'verify') {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown(previous =>
        previous > 0 ? previous - 1 : 0,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [mode]);

  const authTitle = useMemo(() => {
    if (mode === 'register') {
      return 'Buat Akun';
    }

    if (mode === 'verify') {
      return 'Verifikasi Akun';
    }

    return 'Selamat Datang Kembali';
  }, [mode]);

  const authSubtitle = useMemo(() => {
    if (mode === 'register') {
      return 'Lengkapi informasi berikut untuk membuat akun dan mulai menggunakan sistem.';
    }

    if (mode === 'verify') {
      return 'Masukkan kode 6 digit yang dikirim ke email Anda.';
    }

    return 'Masuk untuk melanjutkan pemantauan program dan pekerjaan Anda.';
  }, [mode]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const switchMode = (nextMode: AuthMode) => {
    clearMessages();
    setMode(nextMode);

    if (nextMode !== 'verify') {
      setOtp(Array(6).fill(''));
    }
  };

  const updateRegisterField = <
    K extends keyof RegisterForm,
  >(
    field: K,
    value: RegisterForm[K],
  ) => {
    setRegisterForm(previous => ({
      ...previous,
      [field]: value,
    }));

    clearMessages();
  };

  const handleLogin = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    clearMessages();

    const normalizedEmail =
      normalizeEmail(loginEmail);

    const profile =
      readProfileFromLocalStorage(normalizedEmail);

    if (!profile) {
      setError(
        'Akun tidak ditemukan. Silakan buat akun terlebih dahulu.',
      );
      return;
    }

    const storedPassword =
      localStorage.getItem(
        getPasswordStorageKey(normalizedEmail),
      ) || '';

    if (
      !loginPassword ||
      loginPassword !== storedPassword
    ) {
      setError(
        'Email atau kata sandi tidak sesuai.',
      );
      return;
    }

    if (rememberMe) {
      localStorage.setItem(
        'monitoring-pengadaan-remember-email',
        normalizedEmail,
      );
    } else {
      localStorage.removeItem(
        'monitoring-pengadaan-remember-email',
      );
    }

    onLogin(profile);
  };

  const handleRegister = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    clearMessages();

    const normalizedEmail =
      normalizeEmail(registerForm.email);

    if (!registerForm.name.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    if (!normalizedEmail) {
      setError('Email wajib diisi.');
      return;
    }

    if (
      readProfileFromLocalStorage(normalizedEmail)
    ) {
      setError(
        'Email sudah terdaftar. Silakan masuk menggunakan akun tersebut.',
      );
      return;
    }

    if (!registerForm.unit.trim()) {
      setError(
        'Unit / satuan kerja wajib diisi.',
      );
      return;
    }

    if (registerForm.password.length < 6) {
      setError(
        'Kata sandi minimal 6 karakter.',
      );
      return;
    }

    if (
      registerForm.password !==
      registerForm.confirmPassword
    ) {
      setError(
        'Konfirmasi kata sandi tidak sama.',
      );
      return;
    }

    if (!registerForm.agree) {
      setError(
        'Anda harus menyetujui ketentuan penggunaan sistem.',
      );
      return;
    }

    const profile: UserProfile = {
      id: createUserId(),
      name: registerForm.name.trim(),
      email: normalizedEmail,
      role: 'Staf',
      unit: registerForm.unit.trim(),
      phone: registerForm.phone.trim(),
    };

    const code =
      generateVerificationCode();

    setPendingProfile(profile);
    setPendingPassword(
      registerForm.password,
    );
    setVerificationCode(code);
    setCountdown(165);
    setOtp(Array(6).fill(''));
    setMode('verify');

    window.setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 50);
  };

  const handleOtpChange = (
    index: number,
    value: string,
  ) => {
    const digit = value
      .replace(/\D/g, '')
      .slice(-1);

    setOtp(previous => {
      const next = [...previous];
      next[index] = digit;
      return next;
    });

    setError('');

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key === 'Backspace' &&
      !otp[index] &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }

    if (
      event.key === 'ArrowLeft' &&
      index > 0
    ) {
      otpRefs.current[index - 1]?.focus();
    }

    if (
      event.key === 'ArrowRight' &&
      index < 5
    ) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    clearMessages();

    const enteredCode = otp.join('');

    if (countdown <= 0) {
      setError(
        'Kode verifikasi sudah kedaluwarsa. Silakan kirim ulang kode.',
      );
      return;
    }

    if (
      enteredCode.length !== 6 ||
      enteredCode !== verificationCode
    ) {
      setError(
        'Kode verifikasi tidak sesuai.',
      );
      return;
    }

    if (
      !pendingProfile ||
      !pendingPassword
    ) {
      setError(
        'Data pendaftaran tidak ditemukan. Silakan daftar ulang.',
      );
      return;
    }

    saveProfileToLocalStorage(
      pendingProfile,
    );

    localStorage.setItem(
      getPasswordStorageKey(
        pendingProfile.email,
      ),
      pendingPassword,
    );

    onLogin(pendingProfile);
  };

  const resendVerificationCode = () => {
    const code =
      generateVerificationCode();

    setVerificationCode(code);
    setCountdown(165);
    setOtp(Array(6).fill(''));
    setError('');
    setNotice(
      'Kode verifikasi baru telah dibuat.',
    );

    window.setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FC] font-sans text-[#0A295C] antialiased">
      <div className="min-h-screen lg:grid lg:grid-cols-[55%_45%]">
        {/* DESKTOP HERO */}
        <section
          className="
            relative hidden min-h-screen
            overflow-hidden bg-[#032E63]
            px-12 py-10 text-white
            lg:flex lg:flex-col
          "
          style={{
            backgroundImage: `
              linear-gradient(
                90deg,
                rgba(2, 34, 76, 0.98) 0%,
                rgba(3, 52, 106, 0.92) 48%,
                rgba(3, 48, 96, 0.64) 76%,
                rgba(2, 36, 76, 0.54) 100%
              ),
              url("${LOGIN_HERO_IMAGE}")
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
          }}
        >
          <div className="relative z-10">
            <img
              src={PELINDO_LOGO}
              alt="Pelindo"
              className="
                h-auto w-[190px]
                object-contain
                drop-shadow-[0_5px_15px_rgba(0,0,0,0.18)]
              "
            />
          </div>

          <div
            className="
              relative z-10 my-auto
              max-w-[590px]
              py-12
            "
          >
            <p
              className="
                text-[34px] font-extrabold
                leading-[1.06] tracking-tight
                text-white xl:text-[40px]
              "
            >
              MONITORING
            </p>

            <p
              className="
                mt-1 text-[34px] font-extrabold
                leading-[1.06] tracking-tight
                text-[#19A9ED]
                xl:text-[40px]
              "
            >
              PENGADAAN TANAH
            </p>

            <div className="mt-5 h-[3px] w-10 rounded-full bg-[#18A8E8]" />

            <h1
              className="
                mt-6 max-w-[500px]
                text-[23px] font-bold
                leading-[1.32] text-white
                xl:text-[26px]
              "
            >
              Progres, Dokumen, dan Risiko
              dalam Satu Tampilan
            </h1>

            <p
              className="
                mt-4 max-w-[510px]
                text-[13px] leading-6
                text-blue-50/90
                xl:text-[14px]
              "
            >
              Pantau status pekerjaan, target, PIC,
              dan dokumen untuk mempercepat tindak
              lanjut.
            </p>
          </div>

          <div
            className="
              relative z-10
              flex items-center justify-between
              border-t border-white/10
              pt-5 text-[9px]
              text-blue-100/70
            "
          >
            <span>
              © 2026 {COMPANY_NAME}
            </span>

            <span>
              Head Office
            </span>
          </div>
        </section>

        {/* MOBILE HERO */}
        <section
          className="
            relative min-h-[230px]
            overflow-hidden bg-[#032E63]
            px-6 py-7 text-white
            lg:hidden
          "
          style={{
            backgroundImage: `
              linear-gradient(
                90deg,
                rgba(2, 34, 76, 0.97) 0%,
                rgba(3, 50, 102, 0.82) 58%,
                rgba(2, 38, 82, 0.56) 100%
              ),
              url("${LOGIN_HERO_IMAGE}")
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center 58%',
          }}
        >
          <img
            src={PELINDO_LOGO}
            alt="Pelindo"
            className="h-auto w-[145px]"
          />

          <div className="mt-8">
            <p className="text-[22px] font-extrabold leading-tight">
              Monitoring
            </p>
            <p className="text-[22px] font-extrabold leading-tight text-[#19A9ED]">
              Pengadaan Tanah
            </p>

            <p className="mt-3 max-w-[290px] text-[11px] leading-5 text-blue-50/85">
              Progres, dokumen, dan risiko dalam
              satu tampilan.
            </p>
          </div>
        </section>

        {/* AUTH AREA */}
        <section
          className="
            relative flex min-h-screen
            items-center justify-center
            overflow-y-auto
            bg-[#F6F9FD]
            px-5 py-8
            sm:px-8
            lg:px-10 lg:py-10
          "
        >
          <div className="w-full max-w-[535px]">
            <div
              className="
                rounded-[26px]
                border border-[#E3ECF6]
                bg-white
                p-5
                shadow-[0_24px_70px_rgba(15,53,92,0.08)]
                sm:p-7
              "
            >
              {mode !== 'verify' && (
                <div
                  className="
                    mb-7 grid grid-cols-2
                    border-b border-[#DFE8F2]
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      switchMode('login')
                    }
                    className={`
                      relative h-12
                      text-[11px] font-bold
                      transition
                      ${
                        mode === 'login'
                          ? 'text-[#0B63CE]'
                          : 'text-slate-500'
                      }
                    `}
                  >
                    Masuk

                    {mode === 'login' && (
                      <span
                        className="
                          absolute bottom-[-1px]
                          left-0 right-0
                          h-[3px]
                          rounded-full
                          bg-[#0B63CE]
                        "
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      switchMode('register')
                    }
                    className={`
                      relative h-12
                      text-[11px] font-bold
                      transition
                      ${
                        mode === 'register'
                          ? 'text-[#0B63CE]'
                          : 'text-slate-500'
                      }
                    `}
                  >
                    Buat Akun

                    {mode === 'register' && (
                      <span
                        className="
                          absolute bottom-[-1px]
                          left-0 right-0
                          h-[3px]
                          rounded-full
                          bg-[#0B63CE]
                        "
                      />
                    )}
                  </button>
                </div>
              )}

              {mode === 'verify' && (
                <button
                  type="button"
                  onClick={() =>
                    switchMode('register')
                  }
                  className="
                    mb-5 inline-flex
                    items-center gap-2
                    text-[10px] font-semibold
                    text-slate-500
                    transition
                    hover:text-[#0B63CE]
                  "
                >
                  <ArrowLeft size={14} />
                  Kembali
                </button>
              )}

              <div>
                <h2
                  className="
                    text-[25px] font-extrabold
                    leading-tight tracking-tight
                    text-[#0A295C]
                    sm:text-[29px]
                  "
                >
                  {authTitle}
                </h2>

                <p
                  className="
                    mt-2 max-w-[440px]
                    text-[11px] leading-5
                    text-slate-500
                  "
                >
                  {authSubtitle}
                </p>
              </div>

              {/* LOGIN */}
              {mode === 'login' && (
                <form
                  onSubmit={handleLogin}
                  className="mt-7 space-y-4"
                >
                  <AuthField
                    label="Email"
                    icon={<Mail size={14} />}
                  >
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={event => {
                        setLoginEmail(
                          event.target.value,
                        );
                        clearMessages();
                      }}
                      placeholder="Masukkan email Anda"
                      className={inputClass}
                    />
                  </AuthField>

                  <AuthField
                    label="Kata Sandi"
                    icon={
                      <LockKeyhole size={14} />
                    }
                  >
                    <div className="relative">
                      <input
                        type={
                          showLoginPassword
                            ? 'text'
                            : 'password'
                        }
                        value={loginPassword}
                        onChange={event => {
                          setLoginPassword(
                            event.target.value,
                          );
                          clearMessages();
                        }}
                        placeholder="Masukkan kata sandi Anda"
                        className={`${inputClass} pr-11`}
                      />

                      <PasswordToggle
                        show={showLoginPassword}
                        onClick={() =>
                          setShowLoginPassword(
                            previous => !previous,
                          )
                        }
                      />
                    </div>
                  </AuthField>

                  <div
                    className="
                      flex items-center
                      justify-between gap-3
                    "
                  >
                    <label
                      className="
                        flex cursor-pointer
                        items-center gap-2
                        text-[9px]
                        font-medium text-slate-500
                      "
                    >
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={event =>
                          setRememberMe(
                            event.target.checked,
                          )
                        }
                        className="
                          h-3.5 w-3.5 rounded
                          border-slate-300
                          accent-[#0B63CE]
                        "
                      />

                      Ingat saya
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setNotice(
                          'Reset kata sandi melalui email akan tersedia setelah autentikasi backend diaktifkan.',
                        );
                      }}
                      className="
                        text-[9px] font-semibold
                        text-[#0B63CE]
                        hover:underline
                      "
                    >
                      Lupa kata sandi?
                    </button>
                  </div>

                  <MessageBox
                    error={error}
                    notice={notice}
                  />

                  <button
                    type="submit"
                    className={primaryButtonClass}
                  >
                    Masuk
                  </button>

                  <DividerText text="belum punya akun?" />

                  <button
                    type="button"
                    onClick={() =>
                      switchMode('register')
                    }
                    className={secondaryButtonClass}
                  >
                    Buat Akun Baru
                  </button>

                  <div
                    className="
                      flex items-center gap-2
                      rounded-xl
                      bg-[#F3F7FB]
                      px-3 py-2.5
                    "
                  >
                    <Info
                      size={13}
                      className="
                        shrink-0 text-[#0B63CE]
                      "
                    />

                    <p
                      className="
                        text-[8px] leading-4
                        text-slate-500
                      "
                    >
                      Akun demo:{' '}
                      <strong>
                        staff@landmonitor.id
                      </strong>{' '}
                      / staff123
                    </p>
                  </div>
                </form>
              )}

              {/* REGISTER */}
              {mode === 'register' && (
                <form
                  onSubmit={handleRegister}
                  className="mt-7 space-y-4"
                >
                  <div
                    className="
                      grid grid-cols-1
                      gap-4 sm:grid-cols-2
                    "
                  >
                    <AuthField
                      label="Nama Lengkap"
                      icon={
                        <UserRound size={14} />
                      }
                    >
                      <input
                        value={registerForm.name}
                        onChange={event =>
                          updateRegisterField(
                            'name',
                            event.target.value,
                          )
                        }
                        placeholder="Nama lengkap"
                        className={inputClass}
                      />
                    </AuthField>

                    <AuthField
                      label="Email"
                      icon={<Mail size={14} />}
                    >
                      <input
                        type="email"
                        value={registerForm.email}
                        onChange={event =>
                          updateRegisterField(
                            'email',
                            event.target.value,
                          )
                        }
                        placeholder="nama@pelindo.co.id"
                        className={inputClass}
                      />
                    </AuthField>
                  </div>

                  <div
                    className="
                      grid grid-cols-1
                      gap-4 sm:grid-cols-2
                    "
                  >
                    <AuthField
                      label="Unit / Satuan Kerja"
                      icon={
                        <Building2 size={14} />
                      }
                    >
                      <input
                        value={registerForm.unit}
                        onChange={event =>
                          updateRegisterField(
                            'unit',
                            event.target.value,
                          )
                        }
                        placeholder="Pengadaan Tanah"
                        className={inputClass}
                      />
                    </AuthField>

                    <AuthField
                      label="Nomor Telepon"
                      icon={<Phone size={14} />}
                    >
                      <input
                        value={registerForm.phone}
                        onChange={event =>
                          updateRegisterField(
                            'phone',
                            event.target.value,
                          )
                        }
                        placeholder="08xxxxxxxxxx"
                        className={inputClass}
                      />
                    </AuthField>
                  </div>

                  <div
                    className="
                      grid grid-cols-1
                      gap-4 sm:grid-cols-2
                    "
                  >
                    <AuthField
                      label="Kata Sandi"
                      icon={
                        <LockKeyhole size={14} />
                      }
                    >
                      <div className="relative">
                        <input
                          type={
                            showRegisterPassword
                              ? 'text'
                              : 'password'
                          }
                          value={
                            registerForm.password
                          }
                          onChange={event =>
                            updateRegisterField(
                              'password',
                              event.target.value,
                            )
                          }
                          placeholder="Minimal 6 karakter"
                          className={`${inputClass} pr-11`}
                        />

                        <PasswordToggle
                          show={
                            showRegisterPassword
                          }
                          onClick={() =>
                            setShowRegisterPassword(
                              previous => !previous,
                            )
                          }
                        />
                      </div>
                    </AuthField>

                    <AuthField
                      label="Konfirmasi Kata Sandi"
                      icon={
                        <LockKeyhole size={14} />
                      }
                    >
                      <div className="relative">
                        <input
                          type={
                            showRegisterConfirmPassword
                              ? 'text'
                              : 'password'
                          }
                          value={
                            registerForm.confirmPassword
                          }
                          onChange={event =>
                            updateRegisterField(
                              'confirmPassword',
                              event.target.value,
                            )
                          }
                          placeholder="Ulangi kata sandi"
                          className={`${inputClass} pr-11`}
                        />

                        <PasswordToggle
                          show={
                            showRegisterConfirmPassword
                          }
                          onClick={() =>
                            setShowRegisterConfirmPassword(
                              previous => !previous,
                            )
                          }
                        />
                      </div>
                    </AuthField>
                  </div>

                  <label
                    className="
                      flex cursor-pointer
                      items-start gap-3
                      rounded-xl
                      border border-[#E6EDF5]
                      bg-[#F8FAFD]
                      p-3
                    "
                  >
                    <input
                      type="checkbox"
                      checked={registerForm.agree}
                      onChange={event =>
                        updateRegisterField(
                          'agree',
                          event.target.checked,
                        )
                      }
                      className="
                        mt-0.5 h-3.5 w-3.5
                        accent-[#0B63CE]
                      "
                    />

                    <span
                      className="
                        text-[8.5px]
                        leading-4
                        text-slate-500
                      "
                    >
                      Saya menyetujui ketentuan
                      penggunaan sistem dan kebijakan
                      pengelolaan akun.
                    </span>
                  </label>

                  <MessageBox
                    error={error}
                    notice={notice}
                  />

                  <button
                    type="submit"
                    className={primaryButtonClass}
                  >
                    Daftar
                  </button>

                  <p
                    className="
                      text-center text-[9px]
                      text-slate-400
                    "
                  >
                    Sudah punya akun?{' '}
                    <button
                      type="button"
                      onClick={() =>
                        switchMode('login')
                      }
                      className="
                        font-semibold
                        text-[#0B63CE]
                        hover:underline
                      "
                    >
                      Masuk di sini
                    </button>
                  </p>
                </form>
              )}

              {/* VERIFY */}
              {mode === 'verify' && (
                <form
                  onSubmit={handleVerify}
                  className="mt-7"
                >
                  <div
                    className="
                      rounded-2xl
                      border border-blue-100
                      bg-[#F6FAFF]
                      px-4 py-4 text-center
                    "
                  >
                    <div
                      className="
                        mx-auto grid
                        h-11 w-11 place-items-center
                        rounded-full bg-white
                        text-[#0B63CE]
                        shadow-sm
                      "
                    >
                      <ShieldCheck size={20} />
                    </div>

                    <p
                      className="
                        mt-3 text-[9px]
                        text-slate-500
                      "
                    >
                      Kode dikirim ke
                    </p>

                    <p
                      className="
                        mt-1 text-[11px]
                        font-bold text-[#0A295C]
                      "
                    >
                      {pendingProfile?.email}
                    </p>
                  </div>

                  <div
                    className="
                      mt-6 flex
                      justify-center gap-2
                    "
                  >
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={element => {
                          otpRefs.current[index] =
                            element;
                        }}
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={event =>
                          handleOtpChange(
                            index,
                            event.target.value,
                          )
                        }
                        onKeyDown={event =>
                          handleOtpKeyDown(
                            index,
                            event,
                          )
                        }
                        className="
                          h-12 w-11
                          rounded-xl
                          border border-[#DCE6F1]
                          bg-white text-center
                          text-[16px] font-extrabold
                          text-[#0A295C]
                          outline-none transition
                          focus:border-[#0B63CE]
                          focus:ring-2
                          focus:ring-blue-100
                          sm:h-13 sm:w-12
                        "
                      />
                    ))}
                  </div>

                  <p
                    className="
                      mt-4 text-center
                      text-[9px]
                      text-slate-500
                    "
                  >
                    Kode kedaluwarsa dalam{' '}
                    <strong
                      className="text-[#0B63CE]"
                    >
                      {formatCountdown(countdown)}
                    </strong>
                  </p>

                  <div
                    className="
                      mt-4 rounded-xl
                      border border-amber-100
                      bg-amber-50
                      px-3 py-2.5
                    "
                  >
                    <p
                      className="
                        text-center text-[8px]
                        leading-4
                        text-amber-700
                      "
                    >
                      Prototype: kode demo{' '}
                      <strong>
                        {verificationCode}
                      </strong>
                    </p>
                  </div>

                  <div className="mt-4">
                    <MessageBox
                      error={error}
                      notice={notice}
                    />
                  </div>

                  <button
                    type="submit"
                    className={`${primaryButtonClass} mt-5`}
                  >
                    Verifikasi
                  </button>

                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={
                      resendVerificationCode
                    }
                    className="
                      mt-3 h-10 w-full
                      rounded-xl text-[9px]
                      font-semibold
                      text-[#0B63CE]
                      transition
                      hover:bg-blue-50
                      disabled:cursor-not-allowed
                      disabled:text-slate-300
                    "
                  >
                    {countdown > 0
                      ? 'Kirim ulang setelah kode kedaluwarsa'
                      : 'Kirim ulang kode'}
                  </button>
                </form>
              )}
            </div>

            <div
              className="
                mt-4 flex items-center
                justify-center gap-2
                text-[8.5px]
                text-slate-400
              "
            >
              <LockKeyhole size={11} />

              <span>
                Akses akun dilindungi oleh sistem
                autentikasi dan kontrol akses.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-[#DCE6F1] bg-white px-3 text-[10px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#0B63CE] focus:ring-2 focus:ring-blue-100';

const primaryButtonClass =
  'h-11 w-full rounded-xl bg-[#0B63CE] text-[11px] font-bold text-white shadow-[0_10px_22px_rgba(11,99,206,0.20)] transition hover:bg-[#0958B9] focus:outline-none focus:ring-2 focus:ring-blue-200';

const secondaryButtonClass =
  'h-11 w-full rounded-xl border border-[#0B63CE] bg-white text-[10px] font-bold text-[#0B63CE] transition hover:bg-[#F4F8FF]';

function AuthField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="
          mb-2 flex items-center
          gap-2 text-[9px]
          font-bold text-slate-600
        "
      >
        <span className="text-slate-400">
          {icon}
        </span>
        {label}
      </label>

      {children}
    </div>
  );
}

function PasswordToggle({
  show,
  onClick,
}: {
  show: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        absolute right-3 top-1/2
        -translate-y-1/2
        text-slate-400
        transition
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
  );
}

function DividerText({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className="
        flex items-center gap-3
        py-1
      "
    >
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[8px] text-slate-400">
        {text}
      </span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

function MessageBox({
  error,
  notice,
}: {
  error: string;
  notice: string;
}) {
  if (error) {
    return (
      <div
        className="
          rounded-xl border
          border-red-100 bg-red-50
          px-3 py-2.5
          text-[9px] font-semibold
          leading-4 text-red-600
        "
      >
        {error}
      </div>
    );
  }

  if (notice) {
    return (
      <div
        className="
          rounded-xl border
          border-blue-100 bg-blue-50
          px-3 py-2.5
          text-[9px] font-semibold
          leading-4 text-blue-700
        "
      >
        {notice}
      </div>
    );
  }

  return null;
}

export default LoginPage;
