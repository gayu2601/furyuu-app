import React, {  } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Image } from "react-native";
import Colors from "../../constants/Colors";
import { useNavigation } from '@react-navigation/native';

const SplashScreen = ({navigation}) => {

    //const navigation = useNavigation()

    return (
        <View style={styles.container}>
            <View style={{alignItems: 'center'}}>
                <Image
                    style={styles.logo}
                    source={require('../../../assets/logo.jpeg')}
                    defaultSource={require('../../../assets/logo.jpeg')}
                />
            </View>
        </View>
    )
}

export default SplashScreen

const WIDTH = Dimensions.get('window').width

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 14,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white'
    },
    logo: {
        height: 250,
        width: 250
    },
    title: {
        fontSize: 40,
        fontWeight: '700'
    }
})