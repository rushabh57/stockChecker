// @/constants/Styles.ts
import { Platform, StyleSheet } from 'react-native';

export const Colors = {
    light: {
      background: '#F8F9FA', // Off-white for a cleaner look
      text: '#11181C',
      textMuted: '#687076',
      card: '#FFFFFF',       // Pure white cards on off-white background
      border: '#E6E8EB',
      accent: '#4CAF50',     // Your signature Green
      error: '#FF5252',
      iconBtn: '#F0F2F5',
      cardSecondary: 'whitesmoke',
      textDark: '#11181C',
      tint: '#000',

      // green / refrehsh specific   
      refreshBg: '#91D06C33',
      refreshtint:'#2F6B3F',
      //   logout specific
      logoutBg: '#FA003a10',
      logouttint:"#FA003a",

    //   
    noteBg: "#FCB53B33",
    noteting: "#1A1A1A",


      primary:"#346739",

          //   filter
    filterBg: "#6FA4AF33",
    filtertint: "#1A1A1A",
    },
    dark: {
      background: '#000000',
      tint: '#fff',
       // green / refrehsh specific   
       refreshBg: '#91D06C33',
       refreshtint:'#2F6B3F',
       //   logout specific
       logoutBg: '#FA003a10',
       logouttint:"#FA003a",
 
     //   
     noteBg: "#FCB53B33",
     noteting: "#1A1A1A",
 
 
       primary:"#346739",
 
           //   filter
     filterBg: "#6FA4AF33",
     filtertint: "#1A1A1A",

      text: '#ECEDEE',
      textMuted: '#9BA1A6',
      card: '#0A0A0A',
      border: '#1A1A1A',
      accent: '#4CAF50',
      error: '#FF5252',
      iconBtn: '#111111',
      cardSecondary: '#262626',
      textDark: '#000000',
    },
  };

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // --- Header & Titles ---
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mainTitle: {
    color: Colors.textMain,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  
  // --- Inputs & Search ---
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 99,
    paddingHorizontal: 15,
    height: 48,
  },
  textInput: {
    flex: 1,
    color: Colors.textMain,
    fontSize: 14,
    marginLeft: 10,
  },
 

  // --- Buttons & Interactive ---
  iconBtn: {
    width: 42,
    height: 42,
    // backgroundColor: Colors.cardSecondary + '10', // 20 for 12.5% opacity
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadge:{
    backgroundColor: Colors.card,
  },

  // Variation for Active Filters/Summary (Green/Gold tint)
  activeFilterBtn: {
    backgroundColor: Colors.primary + '10', // 12% opacity Green
    borderColor: Colors.primary,  
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  // --- Cards ---
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
  },
  
  // --- Brand Grid Specifics ---
  brandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    display: "flex",
    padding: 3,
    paddingInline: 0,
    gap: 8,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: 20,
  },
  brandCard: {
    width: 'auto',
    alignItems: 'center',
    marginBottom: 20,
    // marginHorizontal: '1.5%',
  },
  brandLogoCircle: {
    width: 75,
    height: 75,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1
  },
});