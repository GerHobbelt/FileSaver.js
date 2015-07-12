'use strict';

module.exports = gruntConfig;


function gruntConfig(grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);


  grunt.initConfig({

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: {
        src: [
          'Gruntfile.js',
          'FileSaver.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/{,*/}*.js']
      }
    },


    uglify: {
      options: {
        banner: '',
        footer: '',
        beautify: false,
        mangle: false,
        compress: false,
        quoteStyle: 1
      },
      dist: {
        files: {
          'FileSaver.min.js' : [ 'FileSaver.js' ]
        }
      }
    }

  });

  grunt.registerTask('default', ['uglify']);

}
