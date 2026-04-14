import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FieldError {
  path: string;
  message: string;
}

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerDisplayName, setRegisterDisplayName] = useState("");
  const [registerError, setRegisterError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError("");

    try {
      await login(loginEmail, loginPassword);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/");
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || "Invalid email or password";
      setLoginError(errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    setFieldErrors({});

    if (registerPassword !== registerConfirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords don't match" });
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        displayName: registerDisplayName || undefined,
      });
      toast({
        title: "Account created!",
        description: "Welcome to AI Debate. Let's start practicing!",
      });
      navigate("/");
    } catch (error: any) {
      const errorData = error.response?.data?.error;
      const errorMessage = errorData?.message || "Could not create account";

      // Parse field-specific errors from validation
      if (errorData?.details && Array.isArray(errorData.details)) {
        const errors: Record<string, string> = {};
        errorData.details.forEach((detail: FieldError) => {
          errors[detail.path] = detail.message;
        });
        setFieldErrors(errors);

        // Build a detailed error message
        const detailMessages = errorData.details.map((d: FieldError) => `• ${d.message}`).join('\n');
        setRegisterError(detailMessages);
      } else {
        setRegisterError(errorMessage);
      }

      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container max-w-md py-24">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">AI Debate</CardTitle>
            <CardDescription>
              Strengthen your argumentation skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  {loginError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{loginError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginError(""); }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(""); }}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <LogIn className="h-4 w-4 mr-2" />
                    )}
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4 mt-4">
                  {registerError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="whitespace-pre-line">{registerError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerEmail}
                      onChange={(e) => { setRegisterEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: "" })); }}
                      required
                      className={fieldErrors.email ? "border-destructive" : ""}
                    />
                    {fieldErrors.email && (
                      <p className="text-sm text-destructive">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Choose a username"
                      value={registerUsername}
                      onChange={(e) => { setRegisterUsername(e.target.value); setFieldErrors(prev => ({ ...prev, username: "" })); }}
                      required
                      minLength={3}
                      maxLength={30}
                      className={fieldErrors.username ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      3-30 characters. Only letters, numbers, and underscores allowed.
                    </p>
                    {fieldErrors.username && (
                      <p className="text-sm text-destructive">{fieldErrors.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-displayname">Display Name (optional)</Label>
                    <Input
                      id="register-displayname"
                      type="text"
                      placeholder="How should we call you?"
                      value={registerDisplayName}
                      onChange={(e) => setRegisterDisplayName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={registerPassword}
                      onChange={(e) => { setRegisterPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: "" })); }}
                      required
                      minLength={8}
                      className={fieldErrors.password ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      Min 8 chars with uppercase, lowercase, and number.
                    </p>
                    {fieldErrors.password && (
                      <p className="text-sm text-destructive">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirm Password</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      value={registerConfirmPassword}
                      onChange={(e) => { setRegisterConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirmPassword: "" })); }}
                      required
                      className={fieldErrors.confirmPassword ? "border-destructive" : ""}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p className="w-full">
              By continuing, you agree to practice fair debate and improve your reasoning skills.
            </p>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Login;
