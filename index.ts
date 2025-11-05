/**
 * Punto de entrada (bootstrap) de la app Expo.
 *
 * ¿Para qué es?
 * - Registra el componente raíz App con Expo para inicializar correctamente el entorno.
 *
 * ¿Cómo funciona?
 * - registerRootComponent se encarga de llamar AppRegistry.registerComponent y configurar el entorno
 *   tanto en Expo Go como en builds nativos.
 */
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
