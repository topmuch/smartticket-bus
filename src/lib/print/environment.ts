// ============================================
// SmartTicketQR — Environment Detection
// Detects platform, capabilities, and best print method
// ============================================

import type { EnvironmentInfo, PrintEnvironment, PrinterType } from './types';

/**
 * Detect the current environment (client-side only).
 */
export function detectEnvironment(): EnvironmentInfo {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIOS: false,
      isWindows: false,
      isPWA: false,
      hasWebBluetooth: false,
      hasWebUSB: false,
      hasPrintAPI: false,
      userAgent: '',
      screenWidth: 0,
      screenHeight: 0,
    };
  }

  const ua = navigator.userAgent || '';

  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isWindows = /Windows/i.test(ua) || /WinNT/i.test(ua);
  const isPWA = !!window.matchMedia?.('(display-mode: standalone)').matches || !!(navigator as any).standalone;

  const hasWebBluetooth = !!(navigator as any).bluetooth;
  const hasWebUSB = !!(navigator as any).usb;
  const hasPrintAPI = typeof window !== 'undefined' && 'print' in window;

  return {
    isAndroid,
    isIOS,
    isWindows,
    isPWA,
    hasWebBluetooth,
    hasWebUSB,
    hasPrintAPI,
    userAgent: ua,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
  };
}

/**
 * Determine the best print method based on environment.
 * Returns ordered list of preferred methods (first = best).
 */
export function getBestPrintMethods(env: EnvironmentInfo): PrinterType[] {
  const methods: PrinterType[] = [];

  // 1. If thermal printer is available via Web Bluetooth/USB (mobile kiosk)
  if (env.isAndroid && env.hasWebBluetooth) {
    methods.push('thermal_58mm', 'thermal_80mm');
  }

  // 2. Windows desktop — thermal USB/Ethernet or laser
  if (env.isWindows) {
    methods.push('thermal_80mm', 'thermal_58mm', 'laser_a4');
  }

  // 3. Always fall back to browser print
  methods.push('browser');

  // 4. PDF generation as last resort
  methods.push('pdf');

  return methods;
}

/**
 * Detect the print environment category.
 */
export function detectPrintEnvironment(env: EnvironmentInfo): PrintEnvironment {
  if (env.isAndroid && env.isPWA) return 'android_pwa';
  if (env.isWindows) return 'windows_desktop';
  if (env.isPWA) return 'kiosk';
  return 'web_browser';
}

/**
 * Get paper width in mm for a printer type.
 */
export function getPaperWidth(printerType: PrinterType): number {
  switch (printerType) {
    case 'thermal_58mm': return 58;
    case 'thermal_80mm': return 80;
    case 'laser_a4': return 210;
    case 'laser_a5': return 148;
    default: return 80;
  }
}

/**
 * Get printable content width in mm (accounting for margins).
 */
export function getContentWidth(printerType: PrinterType, margins: number = 5): number {
  return getPaperWidth(printerType) - margins * 2;
}

/**
 * Check if the browser supports silent printing (kiosk mode).
 */
export function supportsSilentPrint(): boolean {
  if (typeof window === 'undefined') return false;
  // Chrome/Edge in kiosk mode or with enterprise policy
  return !!(window as any).chrome?.enterprise;
}
