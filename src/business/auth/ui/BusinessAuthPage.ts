import type { BusinessRuntime } from '../../app/BusinessRuntime';

type AuthMode = 'login' | 'register';

export interface BusinessAuthPageOptions {
  runtime: BusinessRuntime;
  initialMode?: AuthMode;
  onAuthenticated: () => void;
}

function createField(
  labelText: string,
  input: HTMLInputElement
): HTMLLabelElement {
  const label = document.createElement('label');
  label.className = 'ib-biz-auth-field';

  const text = document.createElement('span');
  text.textContent = labelText;

  label.append(text, input);
  return label;
}

export function createBusinessAuthPage(
  options: BusinessAuthPageOptions
): HTMLElement {
  const root = document.createElement('section');
  root.className = 'ib-biz-auth-shell';

  const card = document.createElement('div');
  card.className = 'ib-biz-auth-card';

  const kicker = document.createElement('span');
  kicker.className = 'ib-biz-kicker';
  kicker.textContent = 'İSTEBUL Business Beta';

  const title = document.createElement('h1');
  const description = document.createElement('p');

  const form = document.createElement('form');
  form.className = 'ib-biz-auth-form';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'fullName';
  nameInput.autocomplete = 'name';
  nameInput.maxLength = 120;
  nameInput.placeholder = 'Adınız ve soyadınız';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.name = 'email';
  emailInput.autocomplete = 'email';
  emailInput.required = true;
  emailInput.placeholder = 'ornek@sirket.com';

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.name = 'password';
  passwordInput.autocomplete = 'current-password';
  passwordInput.required = true;
  passwordInput.minLength = 8;
  passwordInput.placeholder = 'En az 8 karakter';

  const nameField = createField('Ad soyad', nameInput);
  const emailField = createField('E-posta', emailInput);
  const passwordField = createField('Şifre', passwordInput);

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'ib-biz-button ib-biz-button-primary';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'ib-biz-button';
  resetButton.textContent = 'Şifremi unuttum';

  const switchButton = document.createElement('button');
  switchButton.type = 'button';
  switchButton.className = 'ib-inline-link-btn';

  const feedback = document.createElement('p');
  feedback.className = 'ib-biz-auth-feedback';
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'ib-biz-auth-actions';

  const footer = document.createElement('p');
  footer.className = 'ib-biz-auth-switch';

  let mode: AuthMode = options.initialMode ?? 'login';

  function setBusy(busy: boolean): void {
    submitButton.disabled = busy;
    switchButton.disabled = busy;
    resetButton.disabled = busy;
    emailInput.disabled = busy;
    passwordInput.disabled = busy;
    nameInput.disabled = busy;
  }

  function renderMode(): void {
    const isRegister = mode === 'register';

    title.textContent = isRegister
      ? 'Business hesabı oluşturun'
      : 'Business hesabınıza giriş yapın';

    description.textContent = isRegister
      ? 'İşletmenizi oluşturmak ve AI destekli raporlama araçlarını kullanmak için kayıt olun.'
      : 'Projelerinize, raporlarınıza ve çalışma alanınıza erişin.';

    nameField.hidden = !isRegister;
    nameInput.required = isRegister;

    passwordInput.autocomplete = isRegister
      ? 'new-password'
      : 'current-password';

    submitButton.textContent = isRegister
      ? 'Hesap oluştur'
      : 'Giriş yap';

    resetButton.hidden = isRegister;

    footer.replaceChildren(
      document.createTextNode(
        isRegister
          ? 'Zaten hesabınız var mı? '
          : 'Hesabınız yok mu? '
      ),
      switchButton
    );

    switchButton.textContent = isRegister
      ? 'Giriş yap'
      : 'Kayıt ol';

    feedback.textContent = '';
  }

  switchButton.addEventListener('click', () => {
    mode = mode === 'login' ? 'register' : 'login';
    form.reset();
    renderMode();
  });

  resetButton.addEventListener('click', () => {
    const email = emailInput.value.trim();

    if (!email) {
      feedback.textContent =
        'Şifre sıfırlama bağlantısı için e-posta adresinizi girin.';
      emailInput.focus();
      return;
    }

    setBusy(true);
    feedback.textContent = 'Şifre sıfırlama bağlantısı gönderiliyor…';

    void options.runtime.client.auth
      .resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/business/`
      })
      .then(({ error }) => {
        if (error) throw error;

        feedback.textContent =
          'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.';
      })
      .catch((error: unknown) => {
        feedback.textContent =
          error instanceof Error
            ? error.message
            : 'Şifre sıfırlama bağlantısı gönderilemedi.';
      })
      .finally(() => {
        setBusy(false);
      });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();

    setBusy(true);
    feedback.textContent =
      mode === 'register'
        ? 'Hesabınız oluşturuluyor…'
        : 'Giriş yapılıyor…';

    const request =
      mode === 'register'
        ? options.runtime.client.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName
              },
              emailRedirectTo: `${window.location.origin}/business/`
            }
          })
        : options.runtime.client.auth.signInWithPassword({
            email,
            password
          });

    void request
      .then(({ data, error }) => {
        if (error) throw error;

        if (mode === 'register' && !data.session) {
          feedback.textContent =
            'Hesabınız oluşturuldu. E-posta doğrulama bağlantısını kontrol edin.';
          return;
        }

        feedback.textContent = 'Giriş başarılı. Yönlendiriliyorsunuz…';
        options.onAuthenticated();
      })
      .catch((error: unknown) => {
        feedback.textContent =
          error instanceof Error
            ? error.message
            : 'Kimlik doğrulama işlemi tamamlanamadı.';
      })
      .finally(() => {
        setBusy(false);
      });
  });

  actions.append(submitButton, resetButton);
  form.append(
    nameField,
    emailField,
    passwordField,
    actions,
    feedback
  );

  card.append(
    kicker,
    title,
    description,
    form,
    footer
  );

  root.appendChild(card);
  renderMode();

  return root;
}
