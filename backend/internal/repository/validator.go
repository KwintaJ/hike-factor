package repository

import (
    "unicode"
    "github.com/go-playground/validator/v10"
)

type CustomValidator struct {
    Validator *validator.Validate
}

func (cv *CustomValidator) Validate(i interface{}) error {
    return cv.Validator.Struct(i)
}

func PasswordValidator(fl validator.FieldLevel) bool {
    password := fl.Field().String()

    if len(password) < 8 {
        return false
    }

    var hasUpper, hasLower, hasDigit, hasSpecial bool
    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsDigit(char):
            hasDigit = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }

    return hasUpper && hasLower && hasDigit && hasSpecial
}