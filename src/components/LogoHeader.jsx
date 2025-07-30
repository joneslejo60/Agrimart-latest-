import React from 'react';
import {
  View,
  Image,
  StyleSheet
} from 'react-native';

function LogoHeader(props) {
  return (
    <View style={[styles.container, props.containerStyle]}>
      <Image
        source={require('../../assets/splash2.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginTop: 40,
    marginLeft: 10, // Reduced left margin to move it more to the left
    alignSelf: 'flex-start', // Ensures the container itself is aligned to the left
  },
  logo: {
    width: 100,
    height: 40,
    alignSelf: 'flex-start', // Ensures the image is aligned to the left
  },
});

export default LogoHeader;
