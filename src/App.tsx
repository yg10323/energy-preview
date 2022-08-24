import React from 'react'

export default function App () {

  const testArray: number[] = [123, 345, 13, 34, 1, 234, 23]
  console.log(testArray.sort((a, b) => b - a));

  return (
    <div>App</div>
  )
}
