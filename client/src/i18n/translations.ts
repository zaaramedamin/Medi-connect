// French translations, keyed by the English source string.
// Anything not listed here falls back to English, so partial coverage is safe.
import { PRODUCTS_FR } from './productsFr';

const BASE: Record<string, string> = {
  // ── Header / nav ────────────────────────────────────────────────
  'Find a doctor': 'Trouver un médecin',
  'Shop': 'Boutique',
  'Insights': 'Conseils',
  'Why us': 'Pourquoi nous',
  'Dashboard': 'Tableau de bord',
  'Sign out': 'Se déconnecter',
  'Sign in': 'Se connecter',
  'Get started': 'Commencer',
  'Settings': 'Paramètres',
  'Open bag': 'Ouvrir le panier',
  'Switch to English': "Passer à l'anglais",
  'Switch to French': 'Passer au français',

  // ── Footer ──────────────────────────────────────────────────────
  'Healthcare made simple — find trusted doctors and book appointments online in seconds.':
    'La santé simplifiée — trouvez des médecins de confiance et prenez rendez-vous en ligne en quelques secondes.',
  'For patients': 'Pour les patients',
  'For doctors': 'Pour les médecins',
  'How it works': 'Comment ça marche',
  'Create an account': 'Créer un compte',
  'Partner with us': 'Devenir partenaire',
  'Why MediConnect': 'Pourquoi MediConnect',
  'Doctor sign in': 'Connexion médecin',
  'Contact': 'Contact',
  'Privacy': 'Confidentialité',
  'Terms': 'Conditions',
  'Cookies': 'Cookies',

  // ── Common ──────────────────────────────────────────────────────
  'Verified doctors': 'Médecins vérifiés',
  'Instant confirmation': 'Confirmation instantanée',
  'Free cancellation': 'Annulation gratuite',
  'Cancel': 'Annuler',
  'Save': 'Enregistrer',
  'Delete': 'Supprimer',
  'Loading...': 'Chargement…',

  // ── Home hero ───────────────────────────────────────────────────
  'Trusted by patients across the country': 'La confiance des patients dans tout le pays',
  'Search verified doctors, see their real-time availability, and confirm your visit instantly — no phone calls needed.':
    'Recherchez des médecins vérifiés, consultez leurs disponibilités en temps réel et confirmez votre visite instantanément — sans aucun appel téléphonique.',
  'Condition, specialty, doctor name, or city...': 'Symptôme, spécialité, nom du médecin ou ville…',

  // ── Home sections ───────────────────────────────────────────────
  'Top-rated doctors': 'Médecins les mieux notés',
  'The highest-rated doctors on MediConnect right now.': 'Les médecins les mieux notés sur MediConnect en ce moment.',
  'Browse all →': 'Voir tout →',
  'No doctors available yet.': 'Aucun médecin disponible pour le moment.',
  'Browse by specialty': 'Parcourir par spécialité',
  'Tap a specialty to see available doctors.': 'Touchez une spécialité pour voir les médecins disponibles.',
  'Book a visit in three steps': 'Réservez une visite en trois étapes',
  'From search to confirmation in less than a minute.': 'De la recherche à la confirmation en moins d’une minute.',
  'Search': 'Recherchez',
  'Find doctors by name, specialty, or location — results appear as you type.':
    'Trouvez des médecins par nom, spécialité ou lieu — les résultats apparaissent au fur et à mesure.',
  'Pick a slot': 'Choisissez un créneau',
  'Browse real-time availability on the calendar and choose the time that suits you.':
    'Consultez les disponibilités en temps réel sur le calendrier et choisissez l’horaire qui vous convient.',
  'Get confirmed': 'Confirmez',
  'Receive an instant email confirmation with all your appointment details.':
    'Recevez une confirmation instantanée par e-mail avec tous les détails de votre rendez-vous.',
  'For practitioners': 'Pour les praticiens',
  'Grow your practice with MediConnect': 'Développez votre cabinet avec MediConnect',
  'Set your working hours once — patients book only the slots you offer. Block time off in one click and keep every appointment in a single dashboard. Membership is by invitation — our team verifies every doctor before listing.':
    'Définissez vos horaires une seule fois — les patients ne réservent que les créneaux que vous proposez. Bloquez vos absences en un clic et gérez tous vos rendez-vous depuis un seul tableau de bord. L’adhésion se fait sur invitation — notre équipe vérifie chaque médecin avant sa mise en ligne.',
  'Doctors': 'Médecins',
  'Patients': 'Patients',
  'Avg rating': 'Note moyenne',
  'Health insights': 'Conseils santé',
  'From our doctors — reports & advice': 'Par nos médecins — rapports et conseils',
  'Trusted guidance and public updates, written by the doctors on MediConnect.':
    'Des conseils fiables et des actualités publiques, rédigés par les médecins de MediConnect.',
  'Read the community': 'Lire la communauté',
  'Loved by patients and doctors': 'Apprécié des patients et des médecins',
  'Ready for your next appointment?': 'Prêt pour votre prochain rendez-vous ?',
  'Create a free account and book your first visit today. Your data stays encrypted and is never sold.':
    'Créez un compte gratuit et réservez votre première visite dès aujourd’hui. Vos données restent chiffrées et ne sont jamais vendues.',
  "Get started — it's free": 'Commencer — c’est gratuit',

  // ── Home search / filters ───────────────────────────────────────
  'Filters': 'Filtres',
  'All specialties': 'Toutes les spécialités',
  'All cities': 'Toutes les villes',
  'Sort: Relevance': 'Trier : Pertinence',
  'Top rated': 'Mieux notés',
  'Nearest to me': 'Les plus proches',
  'Price: low to high': 'Prix : croissant',
  'Price: high to low': 'Prix : décroissant',
  'Near me': 'Près de moi',
  'Clear': 'Effacer',
  'List': 'Liste',
  'Map': 'Carte',
  'No doctors found': 'Aucun médecin trouvé',
  'Try a different name, specialty, or location.': 'Essayez un autre nom, spécialité ou lieu.',
  'Geolocation is not supported by your browser.': 'La géolocalisation n’est pas prise en charge par votre navigateur.',
  'Could not get your location. Please allow location access.':
    'Impossible d’obtenir votre position. Veuillez autoriser l’accès à la localisation.',

  // ── Shop ────────────────────────────────────────────────────────
  'Health shop': 'Boutique santé',
  'Parapharmacie & wellness': 'Parapharmacie et bien-être',
  'Home health devices, supplements, skincare, and everyday essentials — delivered to your door.':
    'Appareils de santé, compléments, soins de la peau et essentiels du quotidien — livrés chez vous.',
  'Free delivery over 150 DT': 'Livraison gratuite dès 150 DT',
  'Authentic products': 'Produits authentiques',
  'Search products…': 'Rechercher des produits…',
  'Sort: Featured': 'Trier : En vedette',
  'All': 'Tout',
  'No products found': 'Aucun produit trouvé',
  'Try a different search or category.': 'Essayez une autre recherche ou catégorie.',

  // ── Cart ────────────────────────────────────────────────────────
  'Your bag': 'Votre panier',
  'Order confirmed': 'Commande confirmée',
  'Your bag is empty': 'Votre panier est vide',
  'Browse the health shop to add thermometers, supplements, and everyday parapharmacie essentials.':
    'Parcourez la boutique santé pour ajouter thermomètres, compléments et essentiels de parapharmacie.',
  'Continue shopping': 'Continuer mes achats',
  'Free delivery unlocked': 'Livraison gratuite débloquée',
  'Subtotal': 'Sous-total',
  'Delivery': 'Livraison',
  'Free': 'Gratuite',
  'Total': 'Total',
  'Demo checkout — no payment is taken.': 'Paiement de démonstration — aucun montant n’est prélevé.',
  'Sign in to checkout': 'Connectez-vous pour commander',
  'Thank you for your order': 'Merci pour votre commande',
  'Could not place the order': 'Impossible de passer la commande',
  'Checkout': 'Commander',
  'Placing order…': 'Commande en cours…',
  'Add {amount} more for free delivery.': 'Ajoutez {amount} de plus pour la livraison gratuite.',
  'Your order': 'Votre commande',
  'has been placed. You can follow it in your dashboard under “My orders”.':
    'a été passée. Vous pouvez la suivre dans votre tableau de bord, sous « Mes commandes ».',

  // ── Community / Insights ────────────────────────────────────────
  'Community': 'Communauté',
  'Doctor insights & advice': 'Conseils et analyses des médecins',
  'Public health reports and practical advice from our doctors — and a space for them to share and discuss.':
    'Rapports de santé publique et conseils pratiques de nos médecins — et un espace pour partager et échanger.',
  'Write an article': 'Rédiger un article',
  'Advice': 'Conseils',
  'Reports': 'Rapports',
  'Discussion': 'Discussion',
  'Search articles…': 'Rechercher des articles…',
  'No articles yet': 'Aucun article pour l’instant',
  'Be the first to share an insight with your patients.': 'Soyez le premier à partager un conseil avec vos patients.',
  'Check back soon for advice from our doctors.': 'Revenez bientôt pour des conseils de nos médecins.',

  // ── Auth ────────────────────────────────────────────────────────
  'Welcome back': 'Bon retour',
  'Sign in to your MediConnect account': 'Connectez-vous à votre compte MediConnect',
  'Email': 'E-mail',
  'Password': 'Mot de passe',
  'Forgot password?': 'Mot de passe oublié ?',
  'Signing in...': 'Connexion…',
  "Don't have an account?": 'Vous n’avez pas de compte ?',
  'Create one': 'Créez-en un',
  'Reset your password': 'Réinitialiser votre mot de passe',
  "Enter your account email and we'll send you a reset link.":
    'Saisissez l’e-mail de votre compte et nous vous enverrons un lien de réinitialisation.',
  'Send reset link': 'Envoyer le lien',
  'Sending…': 'Envoi…',
  'Check your inbox': 'Vérifiez votre boîte de réception',
  'If an account exists for that email, a password reset link is on its way. The link opens a page where you can choose a new password.':
    'Si un compte existe pour cet e-mail, un lien de réinitialisation est en route. Ce lien ouvre une page où vous pourrez choisir un nouveau mot de passe.',
  'Back to sign in': 'Retour à la connexion',
  'Remembered it?': 'Vous vous en souvenez ?',
  'Choose a new password': 'Choisissez un nouveau mot de passe',
  'Your account will use this password from now on.': 'Votre compte utilisera désormais ce mot de passe.',
  'New password': 'Nouveau mot de passe',
  'Confirm password': 'Confirmez le mot de passe',
  'Set new password': 'Définir le mot de passe',
  'Saving…': 'Enregistrement…',
  'Password updated — you are signed in.': 'Mot de passe mis à jour — vous êtes connecté.',
  'This reset link is invalid or has expired. Request a fresh one and try again.':
    'Ce lien de réinitialisation est invalide ou a expiré. Demandez-en un nouveau et réessayez.',
  'Request a new link': 'Demander un nouveau lien',
  'Create your account': 'Créez votre compte',
  'Book appointments with trusted doctors in seconds':
    'Prenez rendez-vous avec des médecins de confiance en quelques secondes',
  'Min 8 chars, one uppercase, one number': 'Min. 8 caractères, une majuscule, un chiffre',
  'Creating account...': 'Création du compte…',
  'Create account': 'Créer le compte',
  'Already have an account?': 'Vous avez déjà un compte ?',
  'Are you a doctor?': 'Vous êtes médecin ?',
  'to get listed.': 'pour être référencé.',

  // ── Settings ────────────────────────────────────────────────────
  'Account settings': 'Paramètres du compte',
  'Update your personal details and password.': 'Mettez à jour vos informations personnelles et votre mot de passe.',
  'Profile': 'Profil',
  'Your name is shown on bookings, reviews, and comments.': 'Votre nom apparaît sur les réservations, avis et commentaires.',
  'Full name': 'Nom complet',
  'Your email is your sign-in and can’t be changed here.':
    'Votre e-mail sert d’identifiant et ne peut pas être modifié ici.',
  'Save profile': 'Enregistrer le profil',
  'Profile updated.': 'Profil mis à jour.',
  'Change password': 'Changer le mot de passe',
  'Use at least 8 characters.': 'Utilisez au moins 8 caractères.',
  'Confirm': 'Confirmer',
  'Password changed.': 'Mot de passe modifié.',
  'Contact & medical details': 'Coordonnées et informations médicales',
  'Optional — helps doctors prepare for your visit. Only you can see this.':
    'Facultatif — aide les médecins à préparer votre visite. Vous seul pouvez le voir.',
  'Phone': 'Téléphone',
  'Date of birth': 'Date de naissance',
  'Gender': 'Sexe',
  'Prefer not to say': 'Préfère ne pas préciser',
  'Female': 'Femme',
  'Male': 'Homme',
  'Other': 'Autre',
  'Blood type': 'Groupe sanguin',
  'Unknown': 'Inconnu',
  'City': 'Ville',
  'Emergency contact': 'Contact d’urgence',
  'Address': 'Adresse',
  'Allergies & notes': 'Allergies et notes',
  'Allergies, chronic conditions, medication…': 'Allergies, maladies chroniques, traitements…',
  'Save details': 'Enregistrer les informations',
  'Details saved.': 'Informations enregistrées.',

  // ── Why MediConnect ─────────────────────────────────────────────
  'Healthcare that finally respects your time': 'Une santé qui respecte enfin votre temps',
  'MediConnect brings verified doctors, instant online booking, and a health shop together in one calm, trustworthy place — so getting care never means waiting on hold again.':
    'MediConnect réunit des médecins vérifiés, la réservation en ligne instantanée et une boutique santé en un seul endroit fiable et serein — pour que se soigner ne rime plus jamais avec attente au téléphone.',
  'Create a free account': 'Créer un compte gratuit',
  'Verified doctors, real reviews': 'Médecins vérifiés, avis authentiques',
  'Care that fits your life, not the other way around': 'Des soins qui s’adaptent à votre vie, et non l’inverse',
  'Only verified, vetted doctors — never a stranger': 'Uniquement des médecins vérifiés — jamais un inconnu',
  'Your whole health routine, in one place': 'Toute votre routine santé, au même endroit',
  'Everything you need, nothing you don’t': 'Tout ce dont vous avez besoin, rien de superflu',
  'The old way vs. MediConnect': 'L’ancienne méthode vs. MediConnect',
  'The old way': 'L’ancienne méthode',
  'With MediConnect': 'Avec MediConnect',
  'Are you a doctor? Grow your practice': 'Vous êtes médecin ? Développez votre cabinet',
  'Questions? We’ve got answers': 'Des questions ? Nous avons les réponses',
  'Ready to feel the difference?': 'Prêt à ressentir la différence ?',
  'Browse doctors': 'Parcourir les médecins',
  'Visit the shop': 'Visiter la boutique',
  'Read insights': 'Lire les conseils',
};

export const FR: Record<string, string> = { ...BASE, ...PRODUCTS_FR };
