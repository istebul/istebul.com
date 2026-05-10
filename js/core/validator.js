// Form Validation Module
export class FormValidator {
    constructor() {
        this.rules = this.getValidationRules();
    }

    getValidationRules() {
        return {
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Geçerli bir e-posta adresi girin'
            },
            password: {
                required: true,
                minLength: 8,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Şifre en az 8 karakter, büyük harf, küçük harf ve rakam içermeli'
            },
            fullName: {
                required: true,
                minLength: 3,
                maxLength: 100,
                message: 'Ad Soyad 3-100 karakter arasında olmalı'
            },
            title: {
                required: true,
                minLength: 5,
                maxLength: 100,
                message: 'Başlık 5-100 karakter arasında olmalı'
            },
            description: {
                required: true,
                minLength: 20,
                maxLength: 2000,
                message: 'Açıklama 20-2000 karakter arasında olmalı'
            },
            price: {
                required: true,
                min: 0,
                max: 10000000,
                pattern: /^\d+$/,
                message: 'Geçerli bir fiyat girin (0-10.000.000)'
            },
            location: {
                required: true,
                minLength: 3,
                maxLength: 120,
                message: 'Konum 3-120 karakter arasında olmalı'
            },
            phone: {
                pattern: /^[\d\s-+()]{10,}$/,
                message: 'Geçerli bir telefon numarası girin'
            },
            bio: {
                maxLength: 500,
                message: 'Bio 500 karakterden fazla olamaz'
            }
        };
    }

    validate(fieldName, value, customRules = null) {
        const rules = customRules || this.rules[fieldName];
        if (!rules) return { valid: true };

        const errors = [];

        // Required check
        if (rules.required && !value) {
            errors.push(`${fieldName} zorunludur`);
            return { valid: false, errors };
        }

        if (!value) {
            return { valid: true };
        }

        // Min length
        if (rules.minLength && String(value).length < rules.minLength) {
            errors.push(`Minimum ${rules.minLength} karakter gerekli`);
        }

        // Max length
        if (rules.maxLength && String(value).length > rules.maxLength) {
            errors.push(`Maksimum ${rules.maxLength} karakter izin`);
        }

        // Pattern
        if (rules.pattern && !rules.pattern.test(String(value))) {
            errors.push(rules.message || `${fieldName} geçersiz format`);
        }

        // Min value
        if (rules.min !== undefined && Number(value) < rules.min) {
            errors.push(`Minimum değer ${rules.min}`);
        }

        // Max value
        if (rules.max !== undefined && Number(value) > rules.max) {
            errors.push(`Maksimum değer ${rules.max}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    validateForm(formData, fieldsToValidate) {
        const results = {};
        let isFormValid = true;

        for (const fieldName of fieldsToValidate) {
            const value = formData[fieldName];
            const result = this.validate(fieldName, value);
            results[fieldName] = result;

            if (!result.valid) {
                isFormValid = false;
            }
        }

        return {
            valid: isFormValid,
            results
        };
    }

    displayErrors(formElement, validationResults) {
        // Clear previous errors
        formElement.querySelectorAll('.form-error').forEach(el => el.remove());
        formElement.querySelectorAll('.form-group.error').forEach(el => {
            el.classList.remove('error');
        });

        // Display new errors
        for (const [fieldName, result] of Object.entries(validationResults)) {
            if (!result.valid && result.errors.length > 0) {
                const field = formElement.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    const formGroup = field.closest('.form-group');
                    if (formGroup) {
                        formGroup.classList.add('error');
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'form-error';
                        errorDiv.textContent = result.errors[0];
                        formGroup.appendChild(errorDiv);
                    }
                }
            }
        }
    }

    setupFormValidation(formElement, fieldsToValidate) {
        const validator = this;

        // Real-time validation on blur
        fieldsToValidate.forEach(fieldName => {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            if (field) {
                field.addEventListener('blur', (e) => {
                    const result = validator.validate(fieldName, e.target.value);
                    if (!result.valid) {
                        const formGroup = field.closest('.form-group');
                        if (formGroup) {
                            formGroup.classList.add('error');
                            let errorDiv = formGroup.querySelector('.form-error');
                            if (!errorDiv) {
                                errorDiv = document.createElement('div');
                                errorDiv.className = 'form-error';
                                formGroup.appendChild(errorDiv);
                            }
                            errorDiv.textContent = result.errors[0];
                        }
                    } else {
                        const formGroup = field.closest('.form-group');
                        if (formGroup) {
                            formGroup.classList.remove('error');
                            const errorDiv = formGroup.querySelector('.form-error');
                            if (errorDiv) errorDiv.remove();
                        }
                    }
                });
            }
        });

        // Validation on submit
        formElement.addEventListener('submit', (e) => {
            const formData = new FormData(formElement);
            const data = Object.fromEntries(formData);
            const results = validator.validateForm(data, fieldsToValidate);

            if (!results.valid) {
                e.preventDefault();
                validator.displayErrors(formElement, results.results);
                return false;
            }

            return true;
        });
    }
}

export const validator = new FormValidator();
export default validator;
