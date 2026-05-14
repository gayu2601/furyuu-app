import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, BackHandler } from 'react-native';
import { Button, TopNavigationAction } from "@ui-kitten/components";
import SignatureScreen from 'react-native-signature-canvas';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowIosBackIcon } from "../extra/icons";

const CustomDesign = () => {
    const ref = useRef();
    const route = useRoute();
    const { field, returnFile, prevScreen, editRouteParams } = route.params;
    console.log('route.params in CustomDesign:');
    console.log(route.params);
    const navigation = useNavigation();
    const [uriC, setUriC] = useState(null);
    const { width, height } = Dimensions.get('window');

    const goBackWithParams = () => {
        navigation.navigate({
            name: prevScreen,
            params: { ...editRouteParams }
        });
    };

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TopNavigationAction
                    style={styles.navButton}
                    icon={ArrowIosBackIcon}
                    onPress={goBackWithParams}
                />
            ),
        });
    }, [navigation, prevScreen]);

    useEffect(() => {
        const backAction = () => {
            goBackWithParams();
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [navigation, prevScreen, editRouteParams]);

    const handleOK = (signature) => {
        const uniqueName = `sign_${Date.now()}.png`;
        const path = FileSystem.cacheDirectory + uniqueName;

        FileSystem.writeAsStringAsync(
            path,
            signature.replace('data:image/png;base64,', ''),
            { encoding: FileSystem.EncodingType.Base64 }
        )
            .then(() => {
                if (returnFile) {
                    returnFile(path);
                }
                goBackWithParams();
            })
            .catch(console.error);
    };

    const handleConfirm = () => {
        console.log('end');
        ref.current.readSignature();
    };

    const handleClear = () => {
        ref.current.clearSignature();
        console.log('clear success!');
    };

    // Undo the last stroke
    const handleUndo = () => {
        ref.current.undo();
        console.log('undo success!');
    };

    useEffect(() => {
        console.log('in clearSignature useEffect');
        ref.current.clearSignature();
        setUriC(null);
    }, [field]);

    useEffect(() => {
        if (uriC) {
            console.log('Updated uriC:', uriC);
        }
    }, [uriC]);

    const style = ` body,html { width: 100%; height: 600px; }`;

    return (
        <View style={styles.container}>
            <View style={styles.signscreen}>
                <SignatureScreen
                    ref={ref}
                    onOK={handleOK}
                    webStyle={style}
                />
            </View>
            <View style={styles.buttons}>
                <Button appearance='outline' onPress={handleClear}>Clear</Button>
                <Button appearance='outline' onPress={handleUndo}>Undo</Button>
                <Button appearance='outline' onPress={handleConfirm}>Save</Button>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    container: {
        backgroundColor: 'white',
        flex: 1,
    },
    signscreen: {
        height: 550,
        marginBottom: 10,
    },
    navButton: {
        marginLeft: 20,
    },
});

export default CustomDesign;