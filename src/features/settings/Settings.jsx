import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { Download, Upload, ShieldCheck, Database, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthProvider';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useTheme } from '../../hooks/useTheme';
import { api, errorMessage } from '../../services/api';
import { supabase } from '../../lib/supabase';
import { PageHeader, Card, Button, Field, Loading, FormModal } from '../../components/ui';
import { todayIn } from '../../utils/domain';
import ProfileAvatar from '../../components/ProfileAvatar';
import { downloadFile } from '../../services/export';
import { toCsv } from '../../utils/csv';
function ProfileForm({ profile, user }) {
  const client = useQueryClient();
  const methods = useForm({
    defaultValues: { name: profile.name, phone: profile.phone, timezone: profile.timezone },
  });
  return (
    <FormProvider {...methods}>
      <form
        noValidate
        onSubmit={methods.handleSubmit(async (v) => {
          methods.clearErrors('root');
          try {
            await api.updateProfile(user.id, { ...v, name: v.name.trim() });
            await client.invalidateQueries({ queryKey: ['profile', user.id] });
            toast.success('Profile updated');
          } catch (error) {
            methods.setError('root', { message: errorMessage(error) });
          }
        })}
      >
        <div className="form-grid">
          <Field name="name" label="Full name" required maxLength={120} />
          <Field name="phone" label="Phone" type="tel" />
          <Field
            name="timezone"
            label="Timezone"
            required
            wide
            note="IANA timezone, e.g. Asia/Dhaka or Europe/London."
            rules={{
              validate: (v) => {
                try {
                  new Intl.DateTimeFormat('en', { timeZone: v });
                  return true;
                } catch {
                  return 'Enter a valid IANA timezone';
                }
              },
            }}
          />
        </div>
        <div className="mt-5 text-sm">
          <p className="muted">Account email</p>
          <p>{user.email}</p>
        </div>
        {methods.formState.errors.root && (
          <p className="alert-error mt-4" role="alert">
            {methods.formState.errors.root.message}
          </p>
        )}
        <Button className="mt-6" type="submit" busy={methods.formState.isSubmitting}>
          Save profile
        </Button>
      </form>
    </FormProvider>
  );
}
export default function Settings() {
  const { user, profile, profileQuery, signOut } = useAuth();
  const client = useQueryClient();
  const query = useWorkspace();
  const { theme, setTheme } = useTheme();
  const providers =
    user?.identities?.map((identity) => identity.provider) || user?.app_metadata?.providers || [];
  const googleOnly = providers.includes('google') && !providers.includes('email');
  const [uploading, setUploading] = useState(false),
    [exporting, setExporting] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false),
    [leaving, setLeaving] = useState(false),
    [themeSaving, setThemeSaving] = useState(false);
  if (profileQuery.isPending || !profile) return <Loading />;
  async function upload(e) {
    const input = e.target,
      file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const old = profile.profile_image;
      const path = await api.uploadAvatar(user.id, file);
      client.setQueryData(['profile', user.id], (current) => ({
        ...(current || profile),
        profile_image: path,
      }));
      await client.invalidateQueries({ queryKey: ['profile', user.id] });
      if (old) await supabase.storage.from('jpms-avatars').remove([old]);
      toast.success('Profile photo updated');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
      input.value = '';
    }
  }
  async function exportData(type) {
    setExporting(true);
    try {
      const result = await query.refetch();
      if (result.error || !result.data) throw result.error || new Error('No data available.');
      const stamp = todayIn(profile.timezone);
      if (type === 'json')
        await downloadFile(
          `jpms-backup-${stamp}.json`,
          JSON.stringify(
            {
              app: 'JPMS',
              schema_version: 1,
              exported_at: new Date().toISOString(),
              currency: 'BDT',
              profile,
              data: result.data,
            },
            null,
            2,
          ),
          'application/json',
        );
      else
        await downloadFile(
          `jpms-all-transactions-${stamp}.csv`,
          toCsv(
            ['income', 'expense'].flatMap((kind) =>
              result.data[kind].map((r) => ({ ...r, kind, amount: Number(r.amount) })),
            ),
            [
              { key: 'kind', label: 'Type' },
              { key: 'date', label: 'Date' },
              { key: 'title', label: 'Title' },
              { key: 'category', label: 'Category' },
              { key: 'amount', label: 'Amount BDT' },
              { key: 'description', label: 'Description' },
            ],
          ),
          'text/csv;charset=utf-8',
        );
      toast.success('Export ready');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <PageHeader title="Settings" description="Make this workspace feel like yours." />
      <div className="settings-grid">
        <div className="space-y-5">
          <Card className="settings-section">
            <h2>Your profile</h2>
            <p>The details behind your personal workspace.</p>
            <div className="flex items-center gap-4 mb-7">
              <ProfileAvatar className="!w-18 !h-18 !text-xl" alt="Your profile photo" />
              <div>
                <label
                  className={`btn btn-secondary ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <Upload size={16} />
                  {uploading ? 'Uploading…' : 'Change photo'}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload profile photo"
                    disabled={uploading}
                    onChange={upload}
                  />
                </label>
                <p className="muted text-xs mt-2">JPG, PNG or WebP · up to 2 MB</p>
              </div>
            </div>
            <ProfileForm key={profile.id} profile={profile} user={user} />
          </Card>
          <Card className="settings-section">
            <h2>Security</h2>
            <p>Update your password or sign out of this account.</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="secondary" icon={ShieldCheck} onClick={() => setPasswordOpen(true)}>
                {googleOnly ? 'Set / change password' : 'Change password'}
              </Button>
              <Button
                variant="secondary"
                icon={LogOut}
                busy={leaving}
                onClick={async () => {
                  setLeaving(true);
                  try {
                    await signOut();
                  } catch (error) {
                    toast.error(errorMessage(error));
                  } finally {
                    setLeaving(false);
                  }
                }}
              >
                Sign out
              </Button>
            </div>
          </Card>
        </div>
        <div className="space-y-5">
          <Card className="settings-section">
            <h2>Appearance</h2>
            <p>Choose a theme for your workspace.</p>
            <div className="grid grid-cols-3 gap-3" role="group" aria-label="Theme">
              {['light', 'dark', 'system'].map((v) => (
                <button
                  key={v}
                  className={`p-4 border rounded-lg text-sm capitalize ${theme === v ? 'border-[var(--green)] bg-[var(--green-soft)] font-semibold' : 'border-[var(--border)]'}`}
                  disabled={themeSaving}
                  aria-pressed={theme === v}
                  onClick={async () => {
                    const old = theme;
                    setTheme(v);
                    setThemeSaving(true);
                    try {
                      await api.updateProfile(user.id, { theme: v });
                      await client.invalidateQueries({ queryKey: ['profile', user.id] });
                    } catch (error) {
                      setTheme(old);
                      toast.error(errorMessage(error));
                    } finally {
                      setThemeSaving(false);
                    }
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="muted text-xs !mt-4 !mb-0">
              This saves your account preference. The top bar toggles only the current device’s
              theme.
            </p>
          </Card>
          <Card className="settings-section">
            <h2>Backup & export</h2>
            <p>Keep a portable copy of your records.</p>
            <div className="space-y-3">
              <Button
                className="w-full"
                variant="secondary"
                icon={Database}
                busy={exporting}
                onClick={() => exportData('json')}
              >
                Download full JSON backup
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                icon={Download}
                busy={exporting}
                onClick={() => exportData('csv')}
              >
                Export all finance data (CSV)
              </Button>
            </div>
            <p className="muted text-xs !mt-4 !mb-0">
              JSON contains your profile and business records, excluding passwords, sessions and
              photo files. The included backup guide explains restoration.
            </p>
          </Card>
          <Card className="settings-section">
            <h2>Notifications</h2>
            <p>Your reminder inbox stays available without device permission.</p>
            <Button
              variant="secondary"
              onClick={() => {
                try {
                  localStorage.removeItem(`jpms-alerts-${user.id}`);
                  toast.success('Browser alerts disabled on this device');
                } catch {
                  toast.error('Device preference could not be updated');
                }
              }}
            >
              Turn off browser alerts
            </Button>
          </Card>
          <Card className="settings-section">
            <h2>About JPMS</h2>
            <p className="!mb-0">
              Jakaria Personal Management System
              <br />
              Version 1.0.0 · Currency: BDT
              <br />
              Built for your studies, teaching and everyday life.
            </p>
          </Card>
        </div>
      </div>
      {passwordOpen && (
        <FormModal
          title={googleOnly ? 'Set / change JPMS password' : 'Change password'}
          description={
            googleOnly
              ? 'Create a JPMS password to also sign in with email. Your Google password is not needed.'
              : 'Choose a new password for this account.'
          }
          fields={[
            {
              name: 'current_password',
              label: 'Current password',
              type: 'password',
              required: !googleOnly,
              wide: true,
              autoComplete: 'current-password',
              note: googleOnly
                ? 'Leave blank if you have not set a JPMS password before.'
                : undefined,
            },
            {
              name: 'password',
              label: 'New password',
              type: 'password',
              required: true,
              wide: true,
              autoComplete: 'new-password',
              rules: {
                minLength: { value: 8, message: 'Use at least 8 characters' },
                maxLength: { value: 128, message: 'Use at most 128 characters' },
              },
            },
            {
              name: 'confirm',
              label: 'Confirm new password',
              type: 'password',
              required: true,
              wide: true,
              autoComplete: 'new-password',
            },
          ]}
          onClose={() => setPasswordOpen(false)}
          onSubmit={async (v) => {
            if (v.password !== v.confirm) throw new Error('Passwords do not match.');
            const { error } = await supabase.auth.updateUser({
              password: v.password,
              ...(v.current_password ? { current_password: v.current_password } : {}),
            });
            if (error) throw error;
            toast.success('Password updated');
          }}
        />
      )}
    </>
  );
}
