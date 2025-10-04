import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView>
      <View>
        <Text>Story: </Text>
      </View>

      <View>
        <Text>Your Choices:</Text>
      </View>
    </SafeAreaView>
  );
}
