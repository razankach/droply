import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    BackHandler,
    Dimensions,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import AuthLogo from '../../components/AuthLogo';
import { useAuth } from '../../context/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

type AuthView = 'welcome' | 'login' | 'signup';

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>('welcome');
  const router = useRouter();

  const { login, register, error, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const switchView = (newView: AuthView) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setView(newView);
  };

  const handleBack = () => {
    if (view !== 'welcome') {
      switchView('welcome');
      return true; 
    }
    return false; 
  };
  
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => backHandler.remove();
  }, [view]);

  React.useEffect(() => {
    if (error) {
       alert(error);
    }
  }, [error]);

  const handleLogin = async () => {
    if(!email || !password) {
        alert("Please fill all fields");
        return;
    }
    try {
        await login(email, password);
    } catch(e) {
        console.log("Login failed", e);
    }
  };

  const handleSignup = async () => {
    if(!email || !password || !name || !phone) {
        alert("Please fill all fields");
        return;
    }
    try {
        await register(name, phone, email, password);
    } catch(e) {
        console.log("Signup failed", e);
    }
  };

  const renderWelcomeContent = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => switchView('signup')}
      >
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => switchView('login')}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoginContent = () => (
    <View style={styles.formContainer}>
      <TextInput
        style={styles.input}
        placeholder="Email..."
        placeholderTextColor="#555"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="password..."
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.actionButton} onPress={handleLogin} disabled={isLoading}>
        <Text style={styles.actionButtonText}>{isLoading ? "Loading..." : "login"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => switchView('welcome')} style={styles.backButton}>
        <Text style={styles.backButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSignupContent = () => (
    <View style={styles.formContainer}>
      <TextInput
        style={styles.input}
        placeholder="Email..."
        placeholderTextColor="#555"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="phone number..."
        placeholderTextColor="#555"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="name ..."
        placeholderTextColor="#555"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="password..."
        placeholderTextColor="#555"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.actionButton} onPress={handleSignup} disabled={isLoading}>
        <Text style={styles.actionButtonText}>{isLoading ? "Loading..." : "create"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => switchView('welcome')} style={styles.backButton}>
        <Text style={styles.backButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[
            styles.topSection, 
            view === 'signup' ? { height: height * 0.3 } : { height: height * 0.45 }
          ]}>
          <AuthLogo />
        </View>

        <View style={[
            styles.bottomSection,
            view === 'signup' ? { minHeight: height * 0.7 } : { minHeight: height * 0.55 }
          ]}>
            
          <View style={styles.indicator} />
          
          {view === 'welcome' && renderWelcomeContent()}
          {view === 'login' && renderLoginContent()}
          {view === 'signup' && renderSignupContent()}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  topSection: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  bottomSection: {
    backgroundColor: '#c4a6e6',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 20,
    paddingHorizontal: 30,
    paddingBottom: 40,
    justifyContent: 'flex-start',
  },
  indicator: {
    width: 60,
    height: 5,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 40,
    alignSelf: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#dcc6ee',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'serif',
  },
  formContainer: {
    width: '100%',
    gap: 15,
  },
  input: {
    backgroundColor: '#dcc6ee',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 25,
    fontSize: 16,
    color: '#000',
    fontFamily: 'serif',
  },
  actionButton: {
    backgroundColor: '#7b68ee',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500', 
    fontFamily: 'serif',
  },
  backButton: {
    padding: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  backButtonText: {
    color: '#555',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
