# code_call_lens

This extension for Visual Studio Code visualizes usage metrics using a code lens. 

Code lenses are "actionable contextual information interspersed" according to https://code.visualstudio.com/blogs/2017/02/12/code-lens-roundup. In simpler words, they are little comments that can appear througout the code (interspersed), that are actionable (one, if implemented, can click on it), and they provide contextual information.

With "usage metrics" we mean metrics that describe how often a specific piece of code was invoked during a given period of time. This means that we need three parts to make this plugin work: 

