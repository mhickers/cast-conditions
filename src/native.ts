// Native bridge for the Capacitor iOS/Android build. Every function is safe to
// call on the web (it no-ops or falls back), so the same codebase still ships as
// the website and PWA. Native-only work is guarded by isNative() and wrapped in
// try/catch so a plugin can never crash startup.

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const isNative = (): boolean => Capacitor.isNativePlatform();

// Run once at app startup. No-op on web.
export async function initNative(): Promise<void> {
  if (!isNative()) return;
  // Navy header looks best with light status-bar content. Flip to Style.Light
  // if you ever switch to a light header.
  try { await StatusBar.setStyle({ style: Style.Dark }); } catch {}
  try { await SplashScreen.hide(); } catch {}
  // Ask for notification permission up front so the "Remind me" button just works.
  try { await LocalNotifications.requestPermissions(); } catch {}
}

// Native GPS (more reliable than the browser API inside the app shell).
// Returns null on web or on any failure, so callers can fall back to navigator.geolocation.
export async function getCurrentPositionNative(): Promise<{ lat: number; lon: number } | null> {
  if (!isNative()) return null;
  try {
    await Geolocation.requestPermissions();
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

// Schedule a local notification for the next dawn bite window at a spot.
// Uses today's sunrise time-of-day; if that moment has passed, targets tomorrow.
// Returns false on web or if the user hasn't granted notification permission.
export async function remindAtDawn(label: string, sunriseISO: string | null | undefined): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;

    const now = new Date();
    const when = new Date(now);
    const base = sunriseISO ? new Date(sunriseISO) : null;
    if (base && !isNaN(base.getTime())) {
      when.setHours(base.getHours(), base.getMinutes(), 0, 0);
    } else {
      when.setHours(5, 30, 0, 0);
    }
    // If that time already passed today, schedule for tomorrow.
    if (when.getTime() <= now.getTime() + 60_000) {
      when.setDate(when.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 1_000_000),
        title: '🎣 Dawn bite window',
        body: `Prime fishing window at ${label} around sunrise — check today's conditions before you head out.`,
        schedule: { at: when },
      }],
    });
    return true;
  } catch {
    return false;
  }
}

// Light haptic tap for key actions. No-op on web.
export async function hapticTap(): Promise<void> {
  if (!isNative()) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}
