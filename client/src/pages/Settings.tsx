import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { userApi, aiApi } from "@/lib/api";
import {
  Key,
  Settings as SettingsIcon,
  User,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";

interface ApiKey {
  id: string;
  provider: string;
  keyName: string;
  apiBaseUrl?: string;
  isActive: boolean;
  lastUsed: string | null;
  createdAt: string;
}

interface UserSettings {
  defaultDifficulty: string;
  defaultDebateStyle: string;
  preferredAiProvider: string;
  preferredModel: string | null;
  theme: string;
  notificationsEnabled: boolean;
}

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI (ChatGPT)', placeholder: 'sk-...' },
  { value: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { value: 'google', label: 'Google (Gemini)', placeholder: 'AIza...' },
  { value: 'groq', label: 'Groq', placeholder: 'gsk_...' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [addingKey, setAddingKey] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // New key form
  const [newKeyProvider, setNewKeyProvider] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Ollama status
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; models: string[] } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      const [keysRes, settingsRes, ollamaRes] = await Promise.all([
        userApi.getApiKeys(),
        userApi.getSettings(),
        aiApi.getOllamaStatus().catch(() => ({ data: { connected: false, models: [] } })),
      ]);

      setApiKeys(keysRes.data);
      setSettings(settingsRes.data);
      setOllamaStatus(ollamaRes.data);
      setDisplayName(user?.displayName || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoadingKeys(false);
      setLoadingSettings(false);
    }
  };

  const handleAddApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyProvider || !newKeyValue) return;

    setAddingKey(true);
    try {
      const res = await userApi.addApiKey({
        provider: newKeyProvider,
        apiKey: newKeyValue,
        keyName: newKeyName || undefined,
      });

      setApiKeys([res.data, ...apiKeys]);
      setNewKeyProvider('');
      setNewKeyValue('');
      setNewKeyName('');
      setShowNewKey(false);

      toast({
        title: "API Key Added",
        description: `Your ${PROVIDERS.find(p => p.value === newKeyProvider)?.label} key has been saved securely.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to add API key",
        description: error.response?.data?.error?.message || "Could not save the API key",
        variant: "destructive",
      });
    } finally {
      setAddingKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string, provider: string) => {
    try {
      await userApi.deleteApiKey(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      toast({
        title: "API Key Deleted",
        description: `Your ${PROVIDERS.find(p => p.value === provider)?.label || provider} key has been removed.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete API key",
        description: error.response?.data?.error?.message || "Could not delete the API key",
        variant: "destructive",
      });
    }
  };

  const handleTestProvider = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const res = await aiApi.testProvider(provider);
      toast({
        title: res.data.connected ? "Connection Successful" : "Connection Failed",
        description: res.data.connected
          ? `${PROVIDERS.find(p => p.value === provider)?.label} is working correctly.`
          : "Could not connect to the provider. Check your API key.",
        variant: res.data.connected ? "default" : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.response?.data?.error?.message || "Could not test the provider",
        variant: "destructive",
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSavingSettings(true);
    try {
      await userApi.updateSettings(settings);
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save settings",
        description: error.response?.data?.error?.message || "Could not save settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await userApi.updateProfile({ displayName });
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.response?.data?.error?.message || "Could not save profile",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    const key = apiKeys.find(k => k.provider === provider);
    if (key) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-muted-foreground" />;
  };

  if (loadingKeys || loadingSettings) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Settings</h1>

          <Tabs defaultValue="api-keys" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="api-keys" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Preferences
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
            </TabsList>

            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-6">
              {/* Ollama Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Local AI (Ollama)
                    {ollamaStatus?.connected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Ollama provides free local AI models. No API key required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ollamaStatus?.connected ? (
                    <div className="space-y-2">
                      <p className="text-sm text-green-600">Ollama is running and connected.</p>
                      {ollamaStatus.models.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Available models: {ollamaStatus.models.join(', ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Ollama is not running. Start Ollama to use free local AI models.
                        Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> to install.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Provider Status Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cloud AI Providers</CardTitle>
                  <CardDescription>
                    Add your API keys to use cloud AI providers. Keys are encrypted and stored securely.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {PROVIDERS.map((provider) => (
                      <div key={provider.value} className="flex items-center gap-2 p-3 border rounded-lg">
                        {getProviderIcon(provider.value)}
                        <span className="text-sm font-medium">{provider.label.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add New Key Form */}
                  <form onSubmit={handleAddApiKey} className="space-y-4 border-t pt-4">
                    <h3 className="font-medium">Add New API Key</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Provider</Label>
                        <Select value={newKeyProvider} onValueChange={setNewKeyProvider}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDERS.map((provider) => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Key Name (optional)</Label>
                        <Input
                          placeholder="e.g., Personal Key"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <div className="relative">
                        <Input
                          type={showNewKey ? "text" : "password"}
                          placeholder={PROVIDERS.find(p => p.value === newKeyProvider)?.placeholder || "Enter your API key"}
                          value={newKeyValue}
                          onChange={(e) => setNewKeyValue(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowNewKey(!showNewKey)}
                        >
                          {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Your API key is encrypted before storage. We never store plain text keys.
                      </p>
                    </div>

                    <Button type="submit" disabled={!newKeyProvider || !newKeyValue || addingKey}>
                      {addingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Add API Key
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Existing Keys */}
              {apiKeys.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your API Keys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              {key.isActive ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium">
                                {PROVIDERS.find(p => p.value === key.provider)?.label || key.provider}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">{key.keyName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestProvider(key.provider)}
                              disabled={testingProvider === key.provider}
                            >
                              {testingProvider === key.provider ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Test"
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteApiKey(key.id, key.provider)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Debate Preferences</CardTitle>
                  <CardDescription>
                    Set your default preferences for new debates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Default Difficulty</Label>
                      <Select
                        value={settings?.defaultDifficulty}
                        onValueChange={(value) => setSettings(s => s ? { ...s, defaultDifficulty: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Debate Style</Label>
                      <Select
                        value={settings?.defaultDebateStyle}
                        onValueChange={(value) => setSettings(s => s ? { ...s, defaultDebateStyle: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="socratic">Socratic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred AI Provider</Label>
                      <Select
                        value={settings?.preferredAiProvider}
                        onValueChange={(value) => setSettings(s => s ? { ...s, preferredAiProvider: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ollama">Ollama (Local - Free)</SelectItem>
                          {apiKeys.some(k => k.provider === 'openai') && (
                            <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                          )}
                          {apiKeys.some(k => k.provider === 'anthropic') && (
                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                          )}
                          {apiKeys.some(k => k.provider === 'google') && (
                            <SelectItem value="google">Google (Gemini)</SelectItem>
                          )}
                          {apiKeys.some(k => k.provider === 'groq') && (
                            <SelectItem value="groq">Groq</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select
                        value={settings?.theme}
                        onValueChange={(value) => setSettings(s => s ? { ...s, theme: value } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about your debates
                      </p>
                    </div>
                    <Switch
                      checked={settings?.notificationsEnabled}
                      onCheckedChange={(checked) => setSettings(s => s ? { ...s, notificationsEnabled: checked } : null)}
                    />
                  </div>

                  <Button onClick={handleSaveSettings} disabled={savingSettings}>
                    {savingSettings ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Preferences
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={user?.email || ''} disabled />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={user?.username || ''} disabled />
                    <p className="text-xs text-muted-foreground">Username cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      placeholder="How should we call you?"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Profile
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Settings;
