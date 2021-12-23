import Toast from 'react-native-toast-message'

export const showToast = (type, message, title) => {
  Toast.show({
    type,
    text1: title || null,
    text2: message,
  })
}
