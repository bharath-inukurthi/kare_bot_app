// expo-plugin-kotlin-jvm-target.js
module.exports = function withKotlinJvmTarget(config) {
    return {
      ...config,
      mods: {
        android: {
          gradleProperties: (config, { modResults }) => {
            modResults.contents += `\nkotlin.jvmTarget=17`;
            return config;
          },
        },
      },
    };
  };
  